import test from "node:test";
import assert from "node:assert/strict";
import { PROJECT_FILTERS, filterProjects } from "../src/lib/project-filters.ts";
import { PROJECT_PREVIEWS } from "../src/lib/project-previews.ts";
import { placeNewProjects } from "../src/lib/project-order.ts";
import { arrangeProjectGrid } from "../src/lib/project-arrangement.ts";
import featuredOrder from "../src/lib/featured-order.json" with { type: "json" };

test("the filter cycle is All, Shop, Other", () => {
  assert.deepEqual(PROJECT_FILTERS.map(option => option.label), ["All", "Shop", "Other"]);
});

test("filters partition the published feed without changing its curated order", () => {
  const projects = arrangeProjectGrid(placeNewProjects(PROJECT_PREVIEWS.filter(project => project.media), featuredOrder.order), 1);
  const all = filterProjects(projects, "all"), shop = filterProjects(projects, "shop"), other = filterProjects(projects, "other");
  assert.deepEqual(all, projects);
  assert.equal(all.length, 10);
  assert.equal(shop.length, 7);
  assert.equal(other.length, 3);
  assert.deepEqual(shop, all.filter(project => project.company === "Shop"));
  assert.deepEqual(other, all.filter(project => project.company !== "Shop"));
  assert.equal(new Set([...shop, ...other]).size, all.length);
});

test("Other includes future non-Shop companies and filtering never mutates its input", () => {
  const projects = [{ id: "a", company: "Milk Tooth" }, { id: "b", company: "Shop" }, { id: "c", company: "Another company" }];
  const original = [...projects];
  assert.deepEqual(filterProjects(projects, "other").map(project => project.id), ["a", "c"]);
  assert.deepEqual(projects, original);
  assert.equal(filterProjects([], "shop").length, 0);
});
