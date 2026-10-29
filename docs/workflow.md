# Workflow

How changes get from an editor (laptop, Codex, or Claude on a phone) to something Liam can look at.

## Branches and deploys

- **Work branch:** `portfolio-v3-homepage`. Everything in progress lands here.
- **`main`:** the August version, which is what production serves. Don't push or merge to it unless Liam asks.
- **Vercel** builds every push. Pushes to `portfolio-v3-homepage` update the branch preview:

  **https://portfolio-git-portfolio-cf6d8e-lliamfennell-gmailcoms-projects.vercel.app**

  This link stays the same for the branch, so share it rather than the per-deploy `portfolio-<hash>-…` URLs.
  Vercel shortened the branch name and added the `cf6d8e` hash; a hand-built URL won't work.
- **The preview is behind Vercel login** (deployment protection). Open it in a browser signed in to
  Liam's Vercel account. Agents can't load it themselves.
- **Checking a deploy:** the Vercel check on the GitHub commit reports `success` when the preview is ready.

  ```bash
  gh api repos/liamfenn/Portfolio/commits/<sha>/statuses --jq '.[0].state'
  ```

  Or open the Vercel dashboard → portfolio → Deployments.

## Working from a phone (Codex, Claude)

1. Start the task on `portfolio-v3-homepage`. The agent reads `AGENTS.md` (Codex) or `CLAUDE.md`, which
   imports it (Claude).
2. Describe the change. Screenshots of the preview help a lot for visual feedback.
3. The agent edits, runs `npm test` and `npx tsc --noEmit`, commits, and pushes to the branch.
4. Wait for the Vercel check (about a minute), then open the branch preview link above.
5. Keep one agent per area at a time. Two agents editing `globals.css` or the toy at once will conflict.
   Pull before starting each new task.

Cloud agents usually can't reach the preview (login), Spotify, or the weather API. They should verify with
tests, the type checker, and a local `npm run build`. Liam checks the look on the preview.

## Previews, tools, and query flags

| URL | What it does |
| --- | --- |
| `/` | The homepage. |
| `/process` | “In the margins”, the design and process essay. |
| `/?palette-lab` | Opens the palette lab: **Colors** (the palette quiz) and **Glyphs** (swarm tuning). |
| `/?inspect=off`, `/?inspect` | Turns the design inspector off or on in that browser (remembered). |

Inspector keyboard modes (T, O, P/M/G/S, F, H, Esc) are documented in the README.

## Changing the palette

1. Open `/?palette-lab` on the preview and take the quiz under **Colors**: Y/N or arrow keys, Backspace to
   undo, then the final cut.
2. Click **Copy settings** and paste the JSON into a task: "bake this in as the default palette".
3. The agent replaces `DEFAULT_HEXES` in `src/lib/palette-toy.ts` with the kept hexes (in hue order), updates
   the palette test counts in `tests/playful-effects.test.mjs`, and pushes.

Glyph tuning from the **Glyphs** tab (bounce, pull, and so on) is in the same JSON. Bake it into
`DEFAULT_GLYPHS` the same way.

Votes and tuning are saved per browser (`localStorage`), so taking the quiz on a phone doesn't change what
anyone else sees until it's baked in.

## Local development notes

- `npm run dev` serves on port 3000 by default (Claude's desktop preview uses 3001).
- If a CSS change doesn't show up, the dev server may have missed the write. See "Known gotchas" in
  [`AGENTS.md`](../AGENTS.md).
- For production-like checks: `npm run build && npx next start -p 3002`.
- Spotify's refresh token expires after 180 days. See "Spotify authorization" in the README.
