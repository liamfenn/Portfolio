import test from 'node:test';
import assert from 'node:assert/strict';
import { placeNewProjects } from '../src/lib/project-order.ts';

test("new projects slot in by date without disturbing the hand-set order", () => {
  const project = (id, year, quarter) => ({ id, year, quarter });
  const ids = projects => projects.map(({ id }) => id);
  const existing = [project("a", 2026, 3), project("b", 2026, 4), project("c", 2025, 3)];
  // Hand-set order wins over dates for projects it names.
  assert.deepEqual(ids(placeNewProjects(existing, ["a", "b", "c"])), ["a", "b", "c"]);
  // Newest goes first, the oldest last, and one in between lands before the first older project.
  assert.deepEqual(ids(placeNewProjects([...existing, project("new", 2027, 1)], ["b", "a", "c"])), ["new", "b", "a", "c"]);
  assert.deepEqual(ids(placeNewProjects([...existing, project("new", 2024, 1)], ["b", "a", "c"])), ["b", "a", "c", "new"]);
  assert.deepEqual(ids(placeNewProjects([...existing, project("new", 2026, 2)], ["b", "a", "c"])), ["b", "a", "new", "c"]);
  // A project from the same quarter follows the ones already there.
  assert.deepEqual(ids(placeNewProjects([...existing, project("new", 2026, 3)], ["b", "a", "c"])), ["b", "a", "new", "c"]);
  // Stale or repeated IDs are ignored.
  assert.deepEqual(ids(placeNewProjects(existing, ["gone", "b", "b", "a", "c"])), ["b", "a", "c"]);
});
