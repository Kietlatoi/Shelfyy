const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function loadModule(file, mocks) {
  const { code } = babel.transformFileSync(path.join(__dirname, '..', file), {
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, { exports, require: (name) => {
    assert.ok(Object.hasOwn(mocks, name), `Missing mock: ${name}`);
    return mocks[name];
  } });
  return exports;
}

const outfit = { id: 7, title: 'Outfit đã tạo', items: [{ id: 11, name: 'Áo trắng' }] };

test('latest API unwraps the saved suggestion returned by the backend', async () => {
  const { suggestionApi } = loadModule('src/api/suggestionApi.js', {
    './nodeApiClient': { nodeApiRequest: async () => ({ generated: true, suggestion: outfit }) },
  });
  assert.equal(await suggestionApi.latestToday(), outfit);
});

test('latest API returns null when no suggestion exists today', async () => {
  const { suggestionApi } = loadModule('src/api/suggestionApi.js', {
    './nodeApiClient': { nodeApiRequest: async () => ({ generated: false, suggestion: null }) },
  });
  assert.equal(await suggestionApi.latestToday(), null);
});

// Exercise the actual screen handlers with mocked native views and hook state.
// No device, account, network requests, or extra test dependencies are needed.
async function screenFixture() {
  const state = [];
  let cursor = 0;
  let effect;
  let latest = async () => null;
  let generated = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: (initial) => {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useEffect: (callback) => { effect ||= callback; },
  };
  const mocks = {
    react,
    'react-native': Object.fromEntries(['View', 'Text', 'ScrollView', 'Pressable', 'ActivityIndicator', 'RefreshControl'].map(name => [name, name])),
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-image': { Image: 'Image' },
    'expo-router': { router: { push() {} } },
    '@expo/vector-icons': { MaterialIcons: 'MaterialIcons', Ionicons: 'Ionicons' },
    '../../src/api/suggestionApi': { suggestionApi: {
      latestToday: () => latest(),
      generateToday: async () => { generated++; return outfit; },
    } },
    '../../src/api/dailyOutfitApi': { dailyOutfitApi: {} },
    '../../src/api/weatherApi': { weatherApi: { createSnapshot: async () => ({}) } },
    '../../src/utils/geolocation': { getCurrentLocation: async () => ({ lat: 10, lon: 106 }) },
    '../../src/components/common/AppButton': { __esModule: true, default: 'AppButton' },
    '../../src/components/common/EmptyState': { __esModule: true, default: 'EmptyState' },
    '../../src/components/common/LoadingOverlay': { __esModule: true, default: 'LoadingOverlay' },
    '../../src/constants/colors': { colors: {} },
    '../../src/constants/typography': { typography: {} },
    '../../src/constants/spacing': { radius: {}, shadows: {}, spacing: {} },
    '../../src/constants/categories': { getCategoryLabel: () => 'Áo' },
  };
  mocks['react-native'].StyleSheet = { create: value => value };
  mocks['react-native'].Alert = { alert() {} };
  const { default: Screen } = loadModule('app/(tabs)/suggest.jsx', mocks);
  const render = () => { cursor = 0; return Screen(); };
  render();
  effect();
  await new Promise(resolve => setImmediate(resolve));
  await find(render(), node => node.props?.title === 'Tạo gợi ý hôm nay').props.onPress();
  return { render, setLatest: value => { latest = value; }, generated: () => generated };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  for (const child of [node.props?.refreshControl, ...(node.props?.children || []).flat(Infinity)]) {
    const match = find(child, predicate);
    if (match) return match;
  }
  return null;
}

function assertOutfit(tree) {
  assert.ok(find(tree, node => node.type === 'Text' && node.props.children.includes(outfit.title)));
  assert.equal(find(tree, node => node.props?.title === 'Tạo gợi ý hôm nay'), null);
}

for (const outcome of ['success', 'empty', 'failure']) {
  test(`pull to refresh preserves the generated outfit during loading and after ${outcome}`, async () => {
    const screen = await screenFixture();
    let resolveRequest;
    let rejectRequest;
    screen.setLatest(() => new Promise((resolve, reject) => { resolveRequest = resolve; rejectRequest = reject; }));
    const refresh = find(screen.render(), node => node.type === 'RefreshControl').props.onRefresh();
    assertOutfit(screen.render());
    assert.equal(find(screen.render(), node => node.type === 'RefreshControl').props.refreshing, true);
    if (outcome === 'failure') rejectRequest(new Error('Network unavailable'));
    else resolveRequest(outcome === 'success' ? outfit : null);
    await refresh;
    assertOutfit(screen.render());
    assert.equal(find(screen.render(), node => node.type === 'RefreshControl').props.refreshing, false);
    assert.equal(screen.generated(), 1, 'refresh must not generate another outfit');
  });
}
