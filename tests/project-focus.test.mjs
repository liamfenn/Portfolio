import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectFocusDetails } from "../src/components/project-focus.tsx";

const preview = { id: "example", company: "Shop", label: "Product Page", year: 2026, quarter: 2 };
const render = team => renderToStaticMarkup(createElement(ProjectFocusDetails, { preview: { ...preview, team } }));

test("project focus omits the entire team field when there are no members", () => {
  for (const team of [undefined, []]) {
    const html = render(team);
    assert.doesNotMatch(html, /project-focus-team|<h3|<ul/);
    assert.match(html, /Product Page/);
    assert.match(html, /Q2 26/);
  }
});

test("project focus renders each supplied team member as their own external link", () => {
  const html = render([
    { name: "First Person", href: "https://example.com/first" },
    { name: "Second Person", href: "https://example.com/second" },
  ]);
  assert.match(html, /class="sr-only">Team<\/span>/);
  assert.match(html, /href="https:\/\/example.com\/first" target="_blank" rel="noreferrer"/);
  assert.match(html, /class="sr-only">First Person<\/span>/);
  assert.match(html, /href="https:\/\/example.com\/second" target="_blank" rel="noreferrer"/);
  assert.match(html, /class="sr-only">Second Person<\/span>/);
});
