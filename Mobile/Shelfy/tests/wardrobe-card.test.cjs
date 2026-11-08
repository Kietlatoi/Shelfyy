const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

test('favorite and open-item actions remain separate accessible buttons', () => {
  const mocks = {
    react: { createElement: (type, props, ...children) => ({ type, props, children }) },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', StyleSheet: { create: value => value } },
    'expo-image': { Image: 'Image' },
    '@expo/vector-icons': { MaterialIcons: 'MaterialIcons' },
    '../../constants/colors': { colors: {} },
    '../../constants/typography': { typography: {} },
    '../../constants/spacing': { radius: {}, spacing: {} },
    '../../constants/categories': { getCategoryLabel: () => 'Áo' },
    '../../constants/itemStatus': { statusOptionFor: () => null },
  };
  const { code } = babel.transformFileSync(path.join(__dirname, '../src/components/wardrobe/WardrobeCard.jsx'), {
    babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  });
  const result = {};
  vm.runInNewContext(code, { exports: result, require: name => {
    assert.ok(Object.hasOwn(mocks, name), name);
    return mocks[name];
  } });
  let opened = 0;
  let favorited = 0;
  const item = { id: 'shirt', name: 'Áo trắng' };
  const tree = result.default({ item, onPress: () => opened++, onFavoriteToggle: () => favorited++ });
  const buttons = tree.children.filter(node => node?.type === 'Pressable');
  assert.equal(buttons.length, 2, 'buttons must be siblings so their press events do not nest');
  buttons.find(button => button.props.accessibilityLabel === 'Thêm vào yêu thích').props.onPress();
  assert.equal(favorited, 1);
  assert.equal(opened, 0);
  buttons.find(button => button.props.accessibilityLabel === 'Xem Áo trắng').props.onPress();
  assert.equal(opened, 1);
});
