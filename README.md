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
```

## Adding a work

Open `js/works.js` and add an entry to the `WORKS` array — `tag` must be one
of the keys in `TAGLABEL`, and `media` is either
`{ type: 'image', src }` or `{ type: 'video', src }`.

`js/constants.js` defines `COLS` and `ROWS`; their product must always equal
`WORKS.length`, or the infinite tiling in `infiniteMap.js` starts placing
cards from different tiles on top of each other.

## Photos & videos

Images and videos are not duplicated into this repo — they're loaded live
from the [FeliceDesignPortfolio](https://github.com/FeliceDesign/FeliceDesignPortfolio)
repo (via `raw.githubusercontent.com`) and from Cloudinary. Update the
photos there and the map picks them up automatically.

## Running locally

No build step — just serve the folder statically, e.g.:

```
python3 -m http.server 8080
```

then open `http://localhost:8080`.
