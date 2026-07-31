# FeliceDesignWebsite

An infinite, draggable map of felice design's work. Cards can be dragged and
flung around an endless grid, react to hover with a small force field, and
flip open into a detail view when clicked.

Ported and refactored from a single-file prototype (`felice-map.html`) into
a small, modular vanilla HTML/CSS/JS site — no build step required.

## Structure

```
index.html            markup + stylesheet/script wiring
css/
  variables.css        design tokens (colors, easing)
  base.css              reset, fonts, body
  background.css        wave pattern, vignette, film grain
  header.css             logo, category tabs, hint, contact link
  cards.css               the map itself + the work cards on it
  detail.css              the flip / detail overlay
js/
  constants.js          layout + behaviour tuning (sizes, radii, speeds)
  works.js                the portfolio pieces shown on the map
  infiniteMap.js          builds the endless grid, handles drag + inertia
  forceField.js            hover force field (scale/push cards near cursor)
  tabs.js                    category filter ("Alles" / "Fotografie" / "3D")
  detailView.js              opens/closes the flip detail view
  main.js                     wires all of the above together
assets/
  logo.svg               felice design logo
  wave-pattern.png       background texture
  photos/                optimized copies of the work photos (see below)
```

## Adding a work

Open `js/works.js` and add an entry to the `WORKS` array — `tag` must be one
of the keys in `TAGLABEL`, and `media` is either
`{ type: 'image', src }` or `{ type: 'video', src }`.

`js/constants.js` defines `COLS` and `ROWS`; their product must always equal
`WORKS.length`, or the infinite tiling in `infiniteMap.js` starts placing
cards from different tiles on top of each other.

## Photos & videos

Photos live in `assets/photos/` as web-sized copies (longest edge capped at
1600px, JPEG quality 78) — resized from the full-resolution originals in
[FeliceDesignPortfolio](https://github.com/FeliceDesign/FeliceDesignPortfolio).
Serving those originals directly (several MB each) made the map painfully
slow to load, so optimized copies are committed here instead.

To add or refresh a photo: drop the full-res original in, resize it (e.g.
`Image.open(...).resize(...)` with Pillow, capped at ~1600px / quality ~78),
save it into `assets/photos/`, and reference it from `js/works.js`.

The one video stays on Cloudinary, which already handles delivery and
optimization, so it's referenced directly by URL.

## Running locally

No build step — just serve the folder statically, e.g.:

```
python3 -m http.server 8080
```

then open `http://localhost:8080`.
