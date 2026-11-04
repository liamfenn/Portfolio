import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeProjectGrid } from '../src/lib/project-arrangement.ts';

function* permutations(items) {
  if (!items.length) { yield []; return; }
  for (let i = 0; i < items.length; i++) {
    for (const rest of permutations(items.filter((_, index) => index !== i))) yield [items[i], ...rest];
  }
}
const tiles = [{ id: 'top-a', stackTag: 'top' }, { id: 'plain' }, { id: 'bottom-b', stackTag: 'bottom' }, { id: 'bottom-a', stackTag: 'bottom' }, { id: 'top-b', stackTag: 'top' }];
test('directional separation survives every order, density, and mobile expansion', () => {
  for (const order of permutations(tiles)) for (const columns of [1,2,3,4,6]) {
    for (const expanded of [null, ...(columns === 2 ? tiles.map(tile => tile.id) : [])]) {
      const result = arrangeProjectGrid(order, columns, expanded);
      assert.deepEqual([...result].map(t => t.id).sort(), tiles.map(t => t.id).sort());
      // Simulate CSS grid placement independently, including full-row expansions.
      let row = 0, col = 0;
      const cells = new Map();
      for (const tile of result) {
        const full = tile.id === expanded;
        if (full && col) { row++; col = 0; }
        const occupied = full ? Array.from({length: columns}, (_,i) => i) : [col];
        cells.set(tile.id, {row, occupied});
        col += occupied.length;
        if (col === columns) { row++; col = 0; }
      }
      for (const top of tiles.filter(tile => tile.stackTag === 'top')) for (const bottom of tiles.filter(tile => tile.stackTag === 'bottom')) {
        const above = cells.get(top.id), below = cells.get(bottom.id);
        assert.ok(!(below.row === above.row + 1 && above.occupied.some(c => below.occupied.includes(c))), JSON.stringify({top,bottom,order,columns,expanded,result}));
      }
      if (expanded) assert.equal(result.findIndex(t => t.id === expanded) % 2, 0);
    }
  }
});
test('valid orders stay stable, including bottom above top and missing projects', () => {
  for (const order of [[tiles[3],tiles[0]], [tiles[3],tiles[4]], [tiles[0],tiles[1],tiles[3]], [tiles[0]]]) {
    assert.deepEqual(arrangeProjectGrid(order, 1), order);
    assert.deepEqual(arrangeProjectGrid(order, 1), arrangeProjectGrid(order, 1));
  }
});

test('covered mobile tiles are exempt while other tagged pairs remain protected', () => {
  const top = { id: 'top', stackTag: 'top' }, bottom = { id: 'bottom', stackTag: 'bottom' }, plain = { id: 'plain' };
  assert.deepEqual(arrangeProjectGrid([top,bottom,plain], 1, null, top.id), [top,bottom,plain]);
  assert.deepEqual(arrangeProjectGrid([top,bottom,plain], 1, null, bottom.id), [top,bottom,plain]);
  assert.deepEqual(arrangeProjectGrid([top,bottom,plain], 2, top.id, top.id), [top,bottom,plain]);
  assert.notDeepEqual(arrangeProjectGrid([top,bottom,plain], 1), [top,bottom,plain]);
  assert.notDeepEqual(arrangeProjectGrid([top,bottom,plain], 1, null, plain.id), [top,bottom,plain]);
});
test('untagged tiles do not inherit old ID-specific restrictions', () => {
  const order = [{id:'shop-01'}, {id:'shop-07'}];
  assert.deepEqual(arrangeProjectGrid(order, 1), order);
});
