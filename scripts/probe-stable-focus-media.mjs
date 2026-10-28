// Isolated geometry experiment, not the production focus controller or proof of native Safari compositing.
import assert from 'node:assert/strict';
import { webkit } from 'playwright-core';
const origin = process.argv[2] ?? 'http://localhost:3111';
const browser = await webkit.launch();
try {
  for (const width of [393, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2, isMobile: width < 768, hasTouch: width < 768 });
    await page.goto(`${origin}/?inspect=off`);
    const tile = page.locator('[data-project-id="shop-02"] .homepage-card-trigger');
    await tile.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('[data-project-id="shop-02"] video')?.dataset.frameReady === 'true');
    const result = await tile.evaluate(async trigger => {
      const media = trigger.querySelector('.homepage-project-media'), video = media.querySelector('video');
      const parent = media.parentElement, source = video.currentSrc;
      const style = media.getAttribute('style'), start = media.getBoundingClientRect();
      const targetWidth = Math.min(innerWidth, 620), targetX = (innerWidth - targetWidth) / 2, targetY = 24;
      let pauses = 0, loads = 0, moves = 0, frames = 0;
      video.addEventListener('pause', () => pauses++);
      video.addEventListener('loadstart', () => loads++);
      const observer = new MutationObserver(records => { moves += records.filter(record => [...record.removedNodes].includes(media)).length; });
      observer.observe(document.body, { childList: true, subtree: true });
      let monitoring = true;
      const sample = () => { frames++; if (monitoring) video.requestVideoFrameCallback(sample); };
      video.requestVideoFrameCallback(sample);
      const phases = [];
      for (let cycle = 0; cycle < 4; cycle++) {
        const backdrop = document.createElement('div');
        Object.assign(backdrop.style, { position: 'fixed', inset: '0', zIndex: '2200', background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)' });
        document.body.append(backdrop);
        // Experiment only: native video never leaves the original grid subtree.
        Object.assign(media.style, { position: 'fixed', inset: 'auto', left: `${start.left}px`, top: `${start.top}px`, width: `${start.width}px`, height: `${start.height}px`, zIndex: '2201', pointerEvents: 'auto' });
        const destination = `translate(${targetX - start.left}px, ${targetY - start.top}px) scale(${targetWidth / start.width})`;
        const beforeFrames = frames, beforeTime = video.currentTime;
        const opening = media.animate([{ transform: 'none' }, { transform: destination }], { duration: 180, fill: 'forwards' });
        await opening.finished;
        const top = document.elementFromPoint(innerWidth / 2, targetY + targetWidth / 2);
        phases.push({ cycle, parentStable: media.parentElement === parent, topmost: media.contains(top), frames: frames - beforeFrames, time: video.currentTime - beforeTime, paused: video.paused });
        await new Promise(resolve => setTimeout(resolve, 100));
        const closing = media.animate([{ transform: destination }, { transform: 'none' }], { duration: 180, fill: 'forwards' });
        await closing.finished;
        opening.cancel(); closing.cancel();
        if (style === null) media.removeAttribute('style'); else media.setAttribute('style', style);
        backdrop.remove();
      }
      monitoring = false; observer.disconnect();
      return { phases, pauses, loads, moves, frames, sameSource: source === video.currentSrc, canvases: document.querySelectorAll('canvas.project-preview-handoff, canvas.project-preview-landing').length };
    });
    assert.ok(result.phases.every(phase => phase.parentStable && phase.topmost && phase.frames > 3 && phase.time > .1 && !phase.paused), JSON.stringify(result));
    assert.ok(result.pauses === 0 && result.loads === 0 && result.moves === 0 && result.sameSource && result.canvases === 0, JSON.stringify(result));
    console.log(JSON.stringify({ width, ...result }));
    await page.close();
  }
} finally { await browser.close(); }
