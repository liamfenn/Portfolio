import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeProjectGrid, expandProjectGrid } from '../src/lib/project-arrangement.ts';

function* permutations(items) {
  if (!items.length) { yield []; return; }
  for (let i = 0; i < items.length; i++) {
    for (const rest of permutations(items.filter((_, index) => index !== i))) yield [items[i], ...rest];
  }
}
const tiles = [{ id: 'top-a', stackTag: 'top' }, { id: 'plain' }, { id: 'bottom-b', stackTag: 'bottom' }, { id: 'bottom-a', stackTag: 'bottom' }, { id: 'top-b', stackTag: 'top' }];
test('tag separation survives every base order and density', () => {
  for (const order of permutations(tiles)) for (const columns of [1,2,3,4,6]) {
    const result = arrangeProjectGrid(order, columns);
    assert.deepEqual(result.map(t => t.id).sort(), tiles.map(t => t.id).sort());
    for (const top of tiles.filter(tile => tile.stackTag === 'top')) for (const bottom of tiles.filter(tile => tile.stackTag === 'bottom')) {
      const above = result.findIndex(tile => tile.id === top.id), below = result.findIndex(tile => tile.id === bottom.id);
      assert.notEqual(below - above, columns, JSON.stringify({top,bottom,order,columns,result}));
    }
  }
});
test('valid orders stay stable, including bottom above top and missing projects', () => {
  for (const order of [[tiles[3],tiles[0]], [tiles[3],tiles[4]], [tiles[0],tiles[1],tiles[3]], [tiles[0]]]) {
    assert.deepEqual(arrangeProjectGrid(order, 1), order);
    assert.deepEqual(arrangeProjectGrid(order, 1), arrangeProjectGrid(order, 1));
  }
});
test('opening a tagged tile in list view retains stacking corrections', () => {
  const raw = [tiles[0], tiles[3], tiles[1], tiles[4], tiles[2]];
  const base = arrangeProjectGrid(raw, 1);
  assert.notDeepEqual(base, raw);
  for (const tile of tiles) assert.deepEqual(expandProjectGrid(base, 1, tile.id), base);
});
test('mobile expansion only exchanges a right-column tile with its row neighbor', () => {
  for (const raw of permutations(tiles)) {
    const base = arrangeProjectGrid(raw, 2);
    for (const tile of tiles) {
      const index = base.findIndex(item => item.id === tile.id);
      const opened = expandProjectGrid(base, 2, tile.id);
      const expected = [...base];
      if (index % 2) [expected[index - 1],expected[index]] = [expected[index],expected[index - 1]];
      assert.deepEqual(opened, expected);
      assert.deepEqual(opened.filter(item => item.id !== tile.id && item.id !== base[index - (index % 2)].id), base.filter(item => item.id !== tile.id && item.id !== base[index - (index % 2)].id));
      assert.deepEqual(expandProjectGrid(base, 2, null), base);
      assert.deepEqual(arrangeProjectGrid(raw, 2), base);
    }
  }
});
test('untagged tiles do not inherit old ID-specific restrictions', () => {
  const order = [{id:'shop-01'}, {id:'shop-07'}];
  assert.deepEqual(arrangeProjectGrid(order, 1), order);
});
