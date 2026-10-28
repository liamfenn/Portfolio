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
  assert.match(html, /class="project-focus-text" data-focus-text="[^"]*">Contributors<\/span>/);
  assert.match(html, /href="https:\/\/example.com\/first" target="_blank" rel="noreferrer"/);
  assert.match(html, /class="project-focus-text" data-focus-text="[^"]*">First Person<\/span>/);
  assert.match(html, /href="https:\/\/example.com\/second" target="_blank" rel="noreferrer"/);
  assert.match(html, /class="project-focus-text" data-focus-text="[^"]*">Second Person<\/span>/);
});


test("description and tech render independently of optional contributors", () => {
  const html = renderToStaticMarkup(createElement(ProjectFocusDetails, { preview: { ...preview, description: "A project description.", tech: ["Swift", "UIKit", "Metal"] } }));
  assert.match(html, /project-focus-summary text-bodySerif/);
  assert.match(html, /A project description\./);
  assert.match(html, /project-focus-tech/);
  assert.match(html, /class="project-focus-text" data-focus-text="[^"]*">Tech<\/span>/);
  assert.doesNotMatch(html, /project-focus-team|Contributors/);
  for (const technology of ["Swift", "UIKit", "Metal"]) assert.match(html, new RegExp(`class="project-focus-text" data-focus-text="[^"]*">${technology}<\\/span>`));
});

test("missing or empty description and tech omit their sections", () => {
  for (const extra of [{}, { description: "", tech: [] }]) {
    const html = renderToStaticMarkup(createElement(ProjectFocusDetails, { preview: { ...preview, ...extra } }));
    assert.doesNotMatch(html, /project-focus-summary|project-focus-tech|project-focus-credits/);
  }
});
