# Agent instructions

For any coding agent working on this repo (Codex, Claude Code, others). `CLAUDE.md` imports this file, so there is
one set of rules.

Read these before changing anything:

- [`docs/progress.md`](docs/progress.md): what's built, what's open, and what was tried and rejected.
- [`docs/design-principles.md`](docs/design-principles.md): how the site should look, move, and feel.
- [`docs/workflow.md`](docs/workflow.md): branches, Vercel previews, and working from a phone.
- [`README.md`](README.md): tokens, text styles, the design inspector, and how the letter swarm behaves.

## Branch and deploy rules

- Work on **`portfolio-v3-homepage`**. It is the live work-in-progress, far ahead of `main`.
- **Never push to `main`, merge into it, or open a PR against it unless Liam asks.** `main` is still the
  August version.
- Pull before you start (`git pull origin portfolio-v3-homepage`). Liam works from several machines and
  agents, so the branch may have moved.
- Commit small, focused changes. The subject says what changed; the body says why, especially for anything
  non-obvious. Reverts get their own commit (`git revert`), never a force push.
- Push when a change is done and checked. Every push to the branch builds a Vercel preview. After pushing,
  share the stable branch link from [`docs/workflow.md`](docs/workflow.md), not a per-deploy URL.
- Don't commit `.env.local`, `.claude/`, `.vercel/`, or build output.

## Commands

```bash
npm install
npm run dev          # Next dev server, http://localhost:3000
npm test             # node:test suite in tests/, via tsx
npx tsc --noEmit     # type check
npm run lint         # ESLint
npm run build        # production build
```

Before committing, run `npm test`, `npx tsc --noEmit`, and lint on the files you touched
(`npx eslint src/lib src/components`). `npm run lint` has one **known, pre-existing** error in
`src/hooks/use-video-rendition.ts` (`react-hooks/set-state-in-effect`). Don't count it against your change, and
don't "fix" it in passing without saying so.

The API routes need the keys in `.env.example` (Spotify, OpenWeatherMap). Without them the music player and
weather show placeholders. That's fine for most UI work.

## Code rules

- **Tokens only.** Every color, text style, spacing, and motion value comes from `src/app/tokens.css`
  (colors, spacing, hover and motion) and the four text styles in `src/app/text-styles.css`. When a design
  value is close to a token, use the token and mention the mismatch. Don't add one-off values. Add a new
  token only when no existing role fits, and say so.
- **Visible text** goes through `InspectableText`, inside one of the text-style classes. Pair every text
  `color` declaration with `--inspect-color-token: <token>` so the design inspector reports it.
- **Match the surrounding code**: its naming, comment density, and idiom. Comments explain *why*, not what.
  Keep functions pure and testable where it's natural; physics and rules live in `src/lib/glyph-physics.ts`
  with tests in `tests/`.
- **Reduced motion** (`prefers-reduced-motion`) must turn off the toy and any new motion. Keep content usable
  without JavaScript-driven effects.
- **Don't add dependencies** without a reason. Heavy libraries load lazily, the way Matter.js loads only when
  the globe is hovered, focused, or tapped.
- Prefer CSS for layout. When a rule depends on another value (a gap, a glyph size), express that with a
  custom property rather than repeating the number.

## Where things live

| Area | Files |
| --- | --- |
| Page shell, header, footer slot | `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/portfolio-footer.tsx` |
| Global styles, tokens, text styles | `src/app/globals.css`, `src/app/tokens.css`, `src/app/text-styles.css` |
| Work grid, sort and grid menus | `src/components/project-work.tsx`, `src/lib/project-previews.ts` |
| Music player, bio, identity | `src/components/homepage-identity.tsx`, `src/components/homepage-bio.tsx` |
| Design inspector (dev and preview only) | `src/components/design-inspector.tsx`, `src/lib/design-inspector.ts` |
| Letter swarm engine (Matter.js) | `src/lib/glyph-swarm.ts` |
| Swarm math, pure and tested | `src/lib/glyph-physics.ts`, `tests/playful-effects.test.mjs` |
| Globe and exit ring | `src/components/glyph-globe.tsx` |
| Palette, palette lab, footer strip | `src/lib/palette-toy.ts`, `src/components/palette-toy.tsx` |
| Text scramble with color glitch | `src/hooks/use-color-scramble.ts`, `src/lib/text-scramble.ts` |
| Media registry and video renditions | `src/lib/media-assets.ts`, `src/lib/media-delivery.ts`, `docs/media-workflow.md` |

## Known gotchas

- **The dev server can miss whole-file rewrites of `globals.css`** made by scripts, and keep serving the old
  CSS (even after a restart). Append a line and delete it to force a recompile:
  `echo '/* x */' >> src/app/globals.css && sleep 3 && sed -i '' '$ d' src/app/globals.css`. Then confirm
  the new rule is live (for example with `getComputedStyle`) before judging a layout.
- **Background or hidden browser tabs throttle `requestAnimationFrame` to about 1fps**, so animation timing
  measured there is meaningless. Check motion with frame-independent signals, or on the real preview.
- **Safari doesn't paint the swarm's text mask (`::highlight`) on text that flexbox has wrapped in anonymous
  boxes.** Don't make text spans `display: flex`. Lay out their containers instead.
- **`user-select: none` can also suppress custom highlights.** The swarm temporarily overrides it on the
  footer, Spotify bar, and work controls; its `selectstart` guard still blocks manual selection. Keep those
  overrides in sync if adding non-selectable containers whose text participates in the swarm.
- **The swarm masks letters by character position**, not by text node, and re-attaches through a
  MutationObserver. Components that rewrite their text (`use-scramble`, the clock, the track title) stay
  masked. Keep it that way if you touch `glyph-swarm.ts`.
- **CSS order matters in `globals.css`**: shared rules near the end (like `.work-density-menu`) override
  same-specificity rules above them. The sort menu uses a doubled class for that reason.
