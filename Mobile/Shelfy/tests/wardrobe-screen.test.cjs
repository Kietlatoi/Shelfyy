const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function fixture() {
  const state = [];
  const requests = [];
  let cursor = 0;
  let focus;
  let response = async () => ({ content: [], totalPages: 1 });
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useCallback: callback => callback,
  };
  const mocks = {
    react,
    'react-native': { ...Object.fromEntries(['View', 'Text', 'FlatList', 'RefreshControl', 'ActivityIndicator', 'Pressable'].map(name => [name, name])), StyleSheet: { create: value => value } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-router': { router: { push() {} }, useFocusEffect: callback => { focus = callback; } },
    '@expo/vector-icons': { MaterialIcons: 'MaterialIcons' },
    '../../../src/api/wardrobeApi': { wardrobeApi: { getItems: params => { requests.push(params); return response(); }, getStats: async () => ({}) } },
    '../../../src/api/wardrobePreferenceApi': { wardrobePreferenceApi: { getPreferences: async () => [] } },
    '../../../src/api/adapters': { pageContent: result => result.content },
    '../../../src/constants/colors': { colors: {} },
    '../../../src/constants/typography': { typography: {} },
    '../../../src/constants/spacing': { spacing: {}, radius: {}, shadows: { glow: () => ({}) } },
  };
  for (const [folder, name] of [['wardrobe', 'WardrobeCard'], ['wardrobe', 'WardrobeFilters'], ['wardrobe', 'WardrobeStats'], ['common', 'AppInput'], ['common', 'EmptyState'], ['common', 'ErrorBanner'], ['common', 'ScreenHeader']]) {
    mocks[`../../../src/components/${folder}/${name}`] = { __esModule: true, default: name };
  }
  const { code } = babel.transformFileSync(path.join(__dirname, '../app/(tabs)/wardrobe/index.jsx'), {
    babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, { exports, require(name) { assert.ok(Object.hasOwn(mocks, name), name); return mocks[name]; } });
  const render = () => { cursor = 0; return exports.default(); };
  return { render, requests, respond: value => { response = value; }, async reload() { render(); focus(); await new Promise(resolve => setImmediate(resolve)); } };
}

function find(node, type) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === type) return node;
  for (const child of [node.props?.ListEmptyComponent, ...(node.props?.children || []).flat(Infinity)]) {
    const result = find(child, type);
    if (result) return result;
  }
  return null;
}

test('an empty wardrobe offers adding an item', async () => {
  const screen = fixture();
  await screen.reload();
  assert.equal(find(screen.render(), 'EmptyState').props.actionTitle, 'Thêm món đồ ngay');
});

for (const filter of ['search', 'category']) {
  test(`empty ${filter} results can clear both filters`, async () => {
    const screen = fixture();
    await screen.reload();
    find(screen.render(), 'AppInput').props.onChangeText('áo trắng');
    if (filter === 'category') find(screen.render(), 'WardrobeFilters').props.onSelectCategory('TOP');
    await screen.reload();
    const empty = find(screen.render(), 'EmptyState');
    assert.equal(empty.props.title, 'Không tìm thấy món đồ phù hợp');
    empty.props.onAction();
    await screen.reload();
    assert.equal(screen.requests.at(-1).category, 'ALL');
    assert.equal(screen.requests.at(-1).q, undefined);
  });
}

test('failed loading offers a retry and recovers instead of claiming the wardrobe is empty', async () => {
  const screen = fixture();
  screen.respond(async () => { throw new Error('offline'); });
  await screen.reload();
  const empty = find(screen.render(), 'EmptyState');
  assert.equal(empty.props.actionTitle, 'Thử lại');
  screen.respond(async () => ({ content: [{ id: 'shirt' }], totalPages: 1 }));
  await empty.props.onAction();
  assert.equal(find(screen.render(), 'FlatList').props.data[0].id, 'shirt');
  assert.equal(find(screen.render(), 'ErrorBanner'), null);
});

test('a failed refresh keeps existing items and shows a connection error', async () => {
  const screen = fixture();
  screen.respond(async () => ({ content: [{ id: 'shirt' }], totalPages: 1 }));
  await screen.reload();
  screen.respond(async () => { throw new Error('offline'); });
  find(screen.render(), 'FlatList').props.refreshControl.props.onRefresh();
  await new Promise(resolve => setImmediate(resolve));
  const tree = screen.render();
  assert.equal(find(tree, 'FlatList').props.data[0].id, 'shirt');
  assert.ok(find(tree, 'ErrorBanner').props.message.includes('Kiểm tra kết nối mạng'));
});
