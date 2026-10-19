# Design principles

How the site should look, move, and feel. The exact values live in `src/app/tokens.css` and
`src/app/text-styles.css` (documented in the README). This page is the reasoning behind them.

## The overall feel

- **Quiet, typographic, mostly black on white.** The page is set in two faces, ABC Oracle (sans) and ABC Otto
  (serif), with gray tiers for hierarchy. Color is reserved for the playful layer and project media.
- **A playful layer on top.** The palette strip, the globe, the letter swarm, and the color glitches are
  discoverable delights. They never get in the way of reading or navigating, and they always put the page
  back exactly as it was.
- **Design system first.** Liam is standardizing the system and audits for stragglers. Consistency beats a
  pixel-perfect match to a one-off value.

## Tokens over one-offs

- Every color, text style, spacing, and motion value maps to a token. When a Figma value is near a token
  (for example `rgba(0,0,0,.6)` against `--text-secondary` #555), use the token and flag the mismatch so
  Figma can be corrected.
- **Color roles:** `--text-primary`, `--text-secondary`, `--text-muted`, `--text-green`; fills `--bg-fill`,
  `--bg-secondary-fill`, `--bg-green-fill`, `--bg-purple-fill`. Borders and overlays derive from these with
  opacity.
- **Type:** exactly four styles, `text-bodySerif`, `text-bodySans`, `text-captionSerif`, `text-captionSans`
  (15/20 and 14/19 on desktop, 14/18 and 13/18 on mobile, all weight 400). Pick one; don't set size, leading,
  or weight by hand.
- **When a rule depends on another value**, derive it with a custom property instead of repeating the
  number. For example, the sort menu indent is the dot size plus `--work-label-gap`, and the space above the
  mobile globe subtracts `--footer-row-gap`.

## Layout and spacing

- **Page frame:** 8px around the page (`--page-frame`); text sections add 16px inside it
  (`--content-padding`), or 12px on mobile.
- **Breakpoint:** 768px. Mobile is a real layout, not a squeezed desktop: check both.
- **Section rhythm:** large steps between sections (96 / 72 / 48 / 32px), small gaps inside them (2–16px).
- **Alignment is deliberate.** Menus line up with what they extend: the sort options with the "Featured"
  text, the grid options with the label's right edge. Measure alignment; don't eyeball it.

## Interaction

- **Three hover patterns, one focus ring:**
  - text links and text buttons dim to `--hover-dim`;
  - menu choices darken from `--text-secondary` to `--text-primary`;
  - surfaces (the music player, the avatar) keep full opacity, and their badges slide out instead.
  - Every link and button shares `--focus-ring`.
- **The playful controls** (globe, exit ring) use motion instead: faster spin, a 1.12× swell, a color glitch.
  No outline rings around them. Keyboard focus gets the same speed-up, and focus moves to the ring only
  after a keyboard activation.
- **Touch is first-class.** Hit areas are at least 44px. Touch never traps the page: a vertical flick
  scrolls, while a deliberate touch (on the swarm, resting first, or sideways) plays.

## Motion

- **Organic, never uniform.** Things move at their own moments, speeds, and strengths: staggered starts,
  varied spring stiffness, small random tilts and offsets. Avoid everything arriving or straightening at the
  same instant.
- **Exits mirror entries.** If letters pop out, float, and get pulled in, they let go, float, and glide home in
  reverse order and on the same curves. Whatever left first comes back last.
- **Settle, don't snap or creep.** Springs carry most of the travel. The last few pixels are a short eased
  settle with a slight turn, so letters land precisely without a long tail.
- **Continuity.** Elements hand off instead of swapping: globe characters become the ring, colors carry from
  globe to ring and back, the ring keeps spinning until it folds in.
- **Reduced motion turns it off.** `prefers-reduced-motion` disables the toy and decorative motion; content
  and controls still work.
- Default UI motion uses `--motion-duration` (300ms) and `--motion-ease`. Hover feedback uses
  `--hover-duration` and `--hover-ease`.

## The playful layer's rules

- **Never lose content.** Original text stays mounted, accessible, and current. The swarm shows copies, and
  the originals are only masked (custom highlights), never removed.
- **Decorative elements are `aria-hidden`,** and controls have real labels ("Play with the letters", "Put the
  letters back").
- **Legibility wins over effect.** Thin glyphs on white need contrast. Colors under 1.5:1 (the pale yellows)
  stay in the strip but sit out the glyph effects.
- **Everything resets cleanly.** Exiting restores every letter, mask, color, and the globe. Nothing lingers in
  the DOM.

## Palette

Liam's taste, distilled from his references (risograph posters, a Bloomberg Businessweek spread,
"House" and "Sameheads" posters, a sequence chart, a calendar):

- **Likes:** punchy, print-ink color at mid lightness and real chroma: raspberry, watermelon and bubblegum
  pinks, periwinkle through iris and violet to amethyst, light aquas and clear greens, and vibrant,
  almost-highlighter yellow.
- **Avoid:** burnt or deep orange, anything too deep or muddy, forest green, bright or deep royal blue, and
  mustard yellow. Also the washed-out pastels of the first palette, which disappear as thin glyphs.
- **Order:** hue order in the strip. A shuffled order was tried and reverted.
- The palette lives in `src/lib/palette-toy.ts` (`DEFAULT_HEXES`). Candidates are generated in OKLCH so
  lightness and chroma stay even across hues.

## Performance budgets

- **First load before video:** stay under about 1 MB. Fonts are the biggest cost. Prefer WOFF2 and only the
  weights in use (everything is weight 400).
- **Heavy code loads on intent.** Matter.js loads when the globe is hovered, focused, or tapped. Dev tools
  (Agentation, the inspector) never ship work to production.
- **Video:** a rendition ladder with AV1 first and H.264 fallback, a poster, play only near the viewport,
  pixel density capped at 2×. See [`media-workflow.md`](media-workflow.md).
