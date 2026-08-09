# FeliceDesignWebsite

An infinite, draggable map of felice design's work. Cards can be dragged and
flung around an endless grid; hovering a card grows it to its image's full,
uncropped aspect ratio while its neighbours slide aside to make room, and
clicking flips it open into a full-aspect detail view.

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
  presets.js            all tuning numbers, grouped into switchable presets
  constants.js            picks the desktop/touch values out of the preset
  grid.js                   picks a COLS x ROWS shape for a given work count
  works.js                  the portfolio pieces shown on the map
  aspect.js                   measures each work's true aspect ratio
  infiniteMap.js                builds the endless grid, handles drag + inertia
  forceField.js                  hover focus field: expands the card under the
                                  cursor to its full aspect ratio and pushes
                                  its neighbours out of the way
  tabs.js                          category tabs ("Alles" / "Fotografie" / "3D") —
                                    each rebuilds the map with its own works, in
                                    its own grid
  detailView.js                      opens/closes the flip detail view
  main.js                             wires all of the above together
assets/
  logo.svg               felice design logo
  wave-pattern.png       background texture
  photos/                optimized copies of the work photos (see below)
```

## Presets (UI experiments, reversible)

Every tunable number — card sizes, the focus field, the glow radii, the
navbar scale, the edge blur and vignette — lives in `js/presets.js`, not
scattered across the code. Two presets exist:

| preset | what it is |
| --- | --- |
| `baseline` | the look on `main` — the safe fallback |
| `test01` | wide cursor glow, latched reveal, roomier neighbours, double navbar, heavier edges |

Switching between them:

* **for one visit** — `?preset=baseline` in the URL
* **from the browser console** — `__preset('baseline')` (remembered across
  reloads; `__preset(null)` forgets it, `__preset()` lists them)
* **permanently** — change `DEFAULT_PRESET` at the top of `js/presets.js`

A new experiment is a new entry in `PRESETS`: it only spells out the values
it changes, everything else is inherited from `baseline`. The styling half of
a preset is pushed onto `:root` as CSS custom properties at boot; every
stylesheet repeats the baseline number as the `var()` fallback, so the site
still renders like `baseline` even if the JS never runs.

## Adding a work

Open `js/works.js` and add an entry to the `WORKS` array — `tag` must be one
of the keys in `TAGLABEL`, and `media` is either
`{ type: 'image', src }` or `{ type: 'video', src }`.

Each category tab shows only its own works, in its own grid — `js/grid.js`
picks a COLS x ROWS shape for however many works that turns out to be, so
there's nothing to keep in sync by hand.

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
