import test from "node:test";
import assert from "node:assert/strict";
import { ProjectFocusMedia } from "../src/lib/project-focus-media.ts";

for (const alpha of [false, true]) {
  test(`${alpha ? "transparent" : "opaque"} focus media restores its layers without moving the video`, async t => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "document");
    const backplates = [];
    const animation = () => {
      let finish;
      return { finished: new Promise(resolve => { finish = resolve; }), finish: () => finish(), cancel() {} };
    };
    Object.defineProperty(globalThis, "document", { configurable: true, value: {
      createElement() {
        const plate = { style: {}, setAttribute() {}, remove() { this.removed = true; }, animate: animation };
        backplates.push(plate); return plate;
      },
      body: { appendChild() {} },
    } });
    t.after(() => original ? Object.defineProperty(globalThis, "document", original) : delete globalThis.document);
    const bounds = (left, top, width) => ({ left, top, width, height: width });
    const media = { style: {}, dataset: {},
      getAttribute: () => null, hasAttribute: () => alpha, querySelector: () => null,
      getBoundingClientRect: () => bounds(20, 100, 552),
      removeAttribute() { this.restored = true; }, animate: animation,
    };
    const trigger = { querySelector: () => media }, slot = { clientWidth: 684, getBoundingClientRect: () => bounds(378, 0, 684) };
    const controller = new ProjectFocusMedia();
    assert.equal(controller.attach(trigger, slot), media);
    assert.equal(backplates.length, alpha ? 1 : 0);
    if (alpha) assert.equal(backplates[0].style.transform, media.style.transform);
    const motion = controller.animate(media, bounds(20, 100, 552), bounds(378, 0, 684), { duration: 180 });
    motion.finish(); await motion.finished; await Promise.resolve();
    if (alpha) assert.equal(backplates[0].style.transform, media.style.transform);
    controller.restore(media);
    assert.equal(media.restored, true);
    assert.equal(media.dataset.focusMedia, undefined);
    if (alpha) assert.equal(backplates[0].removed, true);
  });
}
