const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function fixture(rows) {
  const snapshots = rows.map((data, index) => ({ id: String(index), data: () => data }));
  const firestore = {
    collection: (...parts) => parts,
    where: (field, operator, value) => ({ type: 'where', field, operator, value }),
    orderBy: (field, direction) => ({ type: 'orderBy', field, direction }),
    startAfter: snapshot => ({ type: 'startAfter', snapshot }),
    limit: size => ({ type: 'limit', size }),
    query: (collection, ...constraints) => ({ collection, constraints }),
    getDocs: async ({ constraints }) => {
      let docs = snapshots.slice();
      for (const constraint of constraints.filter(c => c.type === 'where')) {
        assert.equal(constraint.operator, '==');
        docs = docs.filter(snapshot => snapshot.data()[constraint.field] === constraint.value);
      }
      const ordering = constraints.find(c => c.type === 'orderBy');
      if (ordering) docs.sort((a, b) => {
        const difference = a.data()[ordering.field] - b.data()[ordering.field];
        return ordering.direction === 'desc' ? -difference : difference;
      });
      const cursor = constraints.find(c => c.type === 'startAfter');
      if (cursor) {
        const index = docs.findIndex(snapshot => snapshot.id === cursor.snapshot.id);
        assert.ok(index >= 0, 'Cursor must refer to a document in this query');
        docs = docs.slice(index + 1);
      }
      const max = constraints.find(c => c.type === 'limit');
      if (max) docs = docs.slice(0, max.size);
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
  };
  const { code } = babel.transformFileSync(path.join(__dirname, '../src/api/wardrobeApi.js'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  const mocks = {
    'firebase/firestore': firestore,
    'firebase/functions': { httpsCallable: () => async () => ({ data: {} }) },
    '../firebase/client': { db: {}, auth: { currentUser: { uid: 'user-a' } }, functions: {} },
  };
  vm.runInNewContext(code, { exports, require: name => {
    assert.ok(Object.hasOwn(mocks, name), `Missing mock: ${name}`);
    return mocks[name];
  } });
  return exports.wardrobeApi;
}

function items(count) {
  return Array.from({ length: count }, (_, index) => ({
    name: `Item ${index}`, brand: '', category: 'TOP', createdAt: count - index,
  }));
}

function ids(page) { return Array.from(page.content, item => item.id); }

test('25 wardrobe items paginate into 20 then 5 without an expired cursor or missing lookahead item', async () => {
  const api = fixture(items(25));
  const first = await api.getItems({ page: 0, size: 20 });
  assert.equal(first.content.length, 20);
  assert.equal(first.totalPages, 2);
  const second = await api.getItems({ page: 1, size: 20 });
  assert.deepEqual(ids(second), ['20', '21', '22', '23', '24']);
  assert.equal(second.totalPages, 2);
});

test('sparse search can reach matches beyond 500 documents without reporting a premature end', async () => {
  const rows = items(725);
  rows[10].name = 'Needle first';
  rows[550].brand = 'Needle brand';
  rows[724].name = 'Needle last';
  const api = fixture(rows);
  const found = [];
  let page = 0;
  let totalPages = 1;
  while (page < totalPages) {
    assert.ok(page < 20, 'Search pagination must eventually reach its end');
    const result = await api.getItems({ q: ' NEEDLE ', page, size: 20 });
    found.push(...ids(result));
    totalPages = result.totalPages;
    page += 1;
  }
  assert.deepEqual(found, ['10', '550', '724']);
});

test('loading a different page size does not overwrite an existing pagination session', async () => {
  const api = fixture(items(60));
  await api.getItems({ page: 0, size: 20 });
  await api.getItems({ page: 0, size: 5 });
  const larger = await api.getItems({ page: 1, size: 20 });
  const smaller = await api.getItems({ page: 1, size: 5 });
  assert.deepEqual(ids(larger), Array.from({ length: 20 }, (_, index) => String(index + 20)));
  assert.deepEqual(ids(smaller), ['5', '6', '7', '8', '9']);
});

test('category and text filters preserve their own cursors when switching lists', async () => {
  const rows = items(60).map((item, index) => ({ ...item, category: index % 2 ? 'BOTTOM' : 'TOP' }));
  const api = fixture(rows);
  await api.getItems({ category: 'TOP', page: 0, size: 5 });
  await api.getItems({ category: 'BOTTOM', q: 'item', page: 0, size: 5 });
  assert.deepEqual(ids(await api.getItems({ category: 'TOP', page: 1, size: 5 })), ['10', '12', '14', '16', '18']);
  assert.deepEqual(ids(await api.getItems({ category: 'BOTTOM', q: 'item', page: 1, size: 5 })), ['11', '13', '15', '17', '19']);
});
