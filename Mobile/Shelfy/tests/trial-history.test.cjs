const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function load(file, mocks = {}, globals = {}) {
  const { code } = babel.transformFileSync(path.join(__dirname, '..', file), {
    babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, { exports, ...globals, require: name => {
    assert.ok(Object.hasOwn(mocks, name), `Missing mock: ${name}`);
    return mocks[name];
  } });
  return exports;
}
const historyUtils = load('src/utils/trialHistory.js');
const pending = { jobId: 34, status: 'PROCESSING', resultImageUrl: null };
const done = { ...pending, status: 'DONE', resultImageUrl: 'https://example.com/result.jpg' };
const failed = { jobId: 33, status: 'FAILED', errorMessage: 'Ảnh chưa phù hợp' };

test('history recovers a completed provider result after the app reconnects', async () => {
  const calls = [];
  const results = await historyUtils.syncPendingTrials([pending, failed, done], async id => {
    calls.push(id);
    return done;
  });
  assert.deepEqual(calls, [34]);
  assert.equal(results[0].resultImageUrl, done.resultImageUrl);
  assert.equal(results[0].status, 'DONE');
  assert.equal(results[1], failed);
  assert.equal(results[2], done);
});

test('one failed status request does not erase history or block other results', async () => {
  const second = { ...pending, jobId: 35 };
  const results = await historyUtils.syncPendingTrials([pending, second], async id => {
    if (id === 34) throw new Error('Offline');
    return { ...done, jobId: id };
  });
  assert.equal(results[0], pending);
  assert.equal(results[1].status, 'DONE');
});

function hooks() {
  const values = [];
  let cursor = 0;
  return {
    values,
    reset: () => { cursor = 0; },
    react: {
      createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
      useCallback: fn => fn,
      useState: initial => {
        const index = cursor++;
        if (!(index in values)) values[index] = initial;
        return [values[index], value => { values[index] = typeof value === 'function' ? value(values[index]) : value; }];
      },
    },
  };
}

test('history refresh stops scheduling when the screen loses focus', async () => {
  const h = hooks();
  let focus;
  let timer;
  let cleared = false;
  const { useTrialHistory } = load('src/hooks/useTrialHistory.js', {
    react: h.react,
    'expo-router': { useFocusEffect: fn => { focus = fn; } },
    '../api/trialApi': { trialApi: { getHistory: async () => ({ content: [pending] }), getStatus: async () => pending } },
    '../api/adapters': { pageContent: page => page.content },
    '../utils/trialHistory': historyUtils,
  }, {
    setTimeout: fn => { timer = fn; return 1; },
    clearTimeout: id => { cleared = id === 1; },
  });
  useTrialHistory();
  const cleanup = focus();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof timer, 'function');
  cleanup();
  assert.equal(cleared, true);
});

function cardFixture(item) {
  const h = hooks();
  const { default: Card } = load('src/components/common/TrialHistoryCard.jsx', {
    react: h.react,
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ActivityIndicator: 'Spinner', StyleSheet: { create: v => v } },
    'expo-image': { Image: 'Image' },
    '@expo/vector-icons': { MaterialIcons: 'Icon' },
    '../../utils/trialHistory': historyUtils,
    '../../constants/colors': { colors: {} },
    '../../constants/spacing': { radius: {}, spacing: {} },
    '../../constants/typography': { typography: {} },
  });
  return () => { h.reset(); return Card({ item, onPress() {} }); };
}

test('pending and failed jobs have labeled placeholders instead of empty images', () => {
  assert.equal(cardFixture(pending)().props.accessibilityLabel, 'Đang xử lý');
  assert.equal(cardFixture(failed)().props.accessibilityLabel, 'Thử đồ thất bại');
});

test('completed history shows the result and an unreadable image gets a placeholder', () => {
  const render = cardFixture(done);
  const card = render();
  assert.equal(card.props.accessibilityLabel, 'Xem kết quả thử đồ');
  const image = card.props.children[0];
  assert.equal(image.type, 'Image');
  assert.equal(image.props.source.uri, done.resultImageUrl);
  image.props.onError();
  assert.equal(render().props.accessibilityLabel, 'Không tải được ảnh');
});
