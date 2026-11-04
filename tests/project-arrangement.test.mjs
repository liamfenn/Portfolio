import test from 'node:test';
import assert from 'node:assert/strict';
import { arrangeProjectGrid } from '../src/lib/project-arrangement.ts';

function* permutations(items) {
  if (!items.length) { yield []; return; }
  for (let i = 0; i < items.length; i++) {
    for (const rest of permutations(items.filter((_, index) => index !== i))) yield [items[i], ...rest];
  }
}
const tiles = ['shop-01', 'shop-02', 'shop-03', 'shop-07', 'shop-05'].map(id => ({id}));
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
      const one = cells.get('shop-01'), seven = cells.get('shop-07');
      assert.ok(!(seven.row === one.row + 1 && one.occupied.some(c => seven.occupied.includes(c))), JSON.stringify({order,columns,expanded,result}));
      if (expanded) assert.equal(result.findIndex(t => t.id === expanded) % 2, 0);
    }
  }
});
test('valid orders stay stable, including seven above one and missing projects', () => {
  for (const order of [[tiles[3],tiles[0]], [tiles[0],tiles[1],tiles[3]], [tiles[0]]]) {
    assert.deepEqual(arrangeProjectGrid(order, 1), order);
    assert.deepEqual(arrangeProjectGrid(order, 1), arrangeProjectGrid(order, 1));
  }
});
