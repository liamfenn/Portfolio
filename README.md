# Colophon

Built with Next.js 16, Tailwind CSS 4, and TypeScript. The current homepage is set in ABC Oracle and ABC Otto. Deployed on Vercel.

Weather data from OpenWeatherMap. Now playing from the Spotify API. Designed and developed by Liam Fennell with assistance from Claude.

## Design tokens

Edit `src/app/tokens.css` to change the homepage's shared colors and typography.
Use these variables in component styles instead of adding raw color or type values.

- Colors: `--color-background`, `--color-foreground`, `--color-muted`,
  `--color-muted-foreground`, `--color-surface`, and named brand colors.
- Fonts: `--font-oracle` for UI and `--font-otto` for prose.
- Type scale: `--text-small` (12px), `--text-caption` (13px),
  `--text-label` (14px), and `--text-body` (15px).
- Responsive roles: `--text-ui` and `--text-prose` use 15px on desktop and
  14px on mobile; `--text-ui-meta` uses 14px and 13px respectively.
- Shared type settings: `--font-weight-regular`, `--leading-body`,
  `--tracking-ui`, and `--tracking-prose`.

Project badge colors reference these same tokens in `src/lib/project-previews.ts`.
The user-selected glitch colors and settings remain in `src/lib/palette-toy.ts`;
they are independent of the UI colors and retain saved palette preferences.

## Spotify authorization

Spotify development-mode refresh tokens expire after 180 days. To reconnect the
music widget, make sure the redirect URI in `.env.local` is registered in the
Spotify developer dashboard, then run:

```bash
npm run spotify:authorize
```

Open the printed authorization URL. After approval, the local callback updates
`SPOTIFY_REFRESH_TOKEN` in `.env.local` without printing it. Rotate the matching
Production environment variable in Vercel and redeploy the current release.
