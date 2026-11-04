import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileProjectOrder, swapProjects, sortProjects} from '../src/lib/project-order.ts';

test('saved order drops stale and duplicate IDs and includes newly added projects', () => {
  assert.deepEqual(reconcileProjectOrder(['a','b','c'], ['b','removed','b','a']), ['b','a','c']);
});
test('drag swaps preserve every item and leave invalid targets unchanged', () => {
  const order = ['a','b','c'];
  assert.deepEqual(swapProjects(order,'a','c'), ['c','b','a']);
  assert.deepEqual(order, ['a','b','c']);
  assert.deepEqual(swapProjects(order,'a','missing'), order);
});
test('Recent sorts dates descending and uses Featured to break date ties', () => {
  const projects = [{id:'a',year:2026,quarter:4},{id:'b',year:2025,quarter:4},{id:'c',year:2026,quarter:4},{id:'d',year:2026,quarter:3}];
  const featured = ['b','c','d','a'];
  assert.deepEqual(sortProjects(projects, featured).map(p=>p.id), featured);
  assert.deepEqual(sortProjects(projects, featured,true).map(p=>p.id), ['c','a','d','b']);
});
