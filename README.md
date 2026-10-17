# Colophon

Built with Next.js 16, Tailwind CSS 4, and TypeScript. The current homepage is set in ABC Oracle and ABC Otto. Deployed on Vercel.

Weather data from OpenWeatherMap. Now playing from the Spotify API. Designed and developed by Liam Fennell with assistance from Claude.

## Design tokens

Edit `src/app/tokens.css` to change the homepage's shared colors and typography.
Use these variables in component styles instead of adding raw color or type values.

- Colors: `--color-background`, `--color-foreground`, `--color-muted`,
  `--color-muted-foreground`, `--color-surface`, and named brand colors.
- Fonts: `--font-oracle` and `--font-otto` bind to the loaded font files.
- Primitive type values: the 12–15px scale, regular weight, 1.35 line height,
  and tracking remain in the token file.

Apply one class from `src/app/text-styles.css` to get the whole text style.
Colors remain independent so the same style can use primary or secondary text.

| Style class | Font | Desktop | Mobile |
| --- | --- | --- | --- |
| `text-body` | Otto | 15px | 14px |
| `text-bodySmall` | Otto | 14px | 14px |
| `text-bodySans` | Oracle | 15px | 14px |
| `text-caption` | Oracle | 14px | 14px |
| `text-captionSmall` | Oracle | 13px | 13px |
| `text-badge` | Oracle | 12px | 12px |

All six styles use weight 400 and line height 1.35. Otto styles track at -2%;
Oracle styles track at -1%. Change a named style's `--type-*` bundle to update
its family, size, weight, and leading together.

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
