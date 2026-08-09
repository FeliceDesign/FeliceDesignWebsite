# felice design — Portfolio

An infinite, draggable map of felice design's work, built with **Astro**. Cards
sit on an endless grid; hovering grows the card under the cursor to its image's
true aspect ratio (a continuous "force field" that pushes neighbours aside), and
clicking flips it open into a detail view. Every piece also has its own static,
crawlable detail page for SEO/GEO.

## How it fits together

- **Content lives in `src/content/works/`** — one Markdown file per piece. That's
  the maintainable surface: adding a work is dropping in a new file, no code
  changes. Schema is in `src/content.config.ts`.
- **Images** are optimized JPEGs under `public/assets/photos/`. **Videos** stay on
  Cloudinary; a work only stores `{ cloudinaryId, version }` and `src/lib/cloudinary.ts`
  derives a size-/quality-capped video URL (`f_auto,q_auto,h_720`) plus a poster
  still. This is what fixed the old "videos don't load": originals were up to
  72 MB and cloned 9× as autoplaying `<video>`s.
- **`src/lib/works.ts`** loads the collection, resolves URLs, and applies
  **`src/lib/arrange.ts`** — a seeded constrained shuffle that scatters the works
  but never puts two videos (or two of the same type) next to each other,
  checked toroidally so the tiling seams don't reintroduce clashes.
- **`src/scripts/`** is the force-map itself (ported from the original vanilla
  build): `infiniteMap` (grid + drag + **video pooling via IntersectionObserver**,
  so only on-screen tiles play), `forceField` (hover effect), `detailView`,
  `tabs`, `constants`, `presets`, `aspect`. `main.ts` wires them together and
  reads the works from `window.__WORKS__` (injected by `index.astro`).
- **SEO/GEO**: `SeoContent.astro` renders a visually-hidden but crawlable list of
  every work + JSON-LD; `src/pages/werk/[slug].astro` gives each work a real,
  JS-free detail page; sitemap + robots are generated at build.

## The tuning editor

All styling (vignette, edge blur, navbar scale, glow) is driven by CSS variables
from `src/scripts/presets.ts`. Append **`?editor`** to the URL to open a slider
panel that changes them live and exports the current values as a preset patch to
paste back into `presets.ts`. It only loads with `?editor`, so normal visitors
never see it.

## Commands

| Command           | Action                                        |
| :---------------- | :-------------------------------------------- |
| `npm install`     | Install dependencies                          |
| `npm run dev`     | Dev server at `localhost:4321`                |
| `npm run build`   | Build the static site to `./dist/`            |
| `npm run preview` | Preview the production build locally          |

## Deploying

Static output, intended for **Cloudflare Pages** (build `npm run build`, output
`dist/`). Set the real domain in `astro.config.mjs` (`SITE`) and `public/robots.txt`
before going live — it drives canonical URLs, OpenGraph and the sitemap. The
`@astrojs/cloudflare` adapter is installed for a later move to Workers/SSR but
isn't wired in while everything can be static.

## Legacy

The original vanilla HTML/CSS/JS build is kept under `legacy/` for reference
until the Astro version is fully settled.
