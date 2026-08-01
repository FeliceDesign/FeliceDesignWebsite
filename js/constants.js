// Layout + behaviour tuning shared by the map and the hover force field.

// Touch devices get smaller cards (more fit on screen) and a field that's
// centered on the screen instead of following a cursor.
export const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

// Rest cards are square, so a landscape image and a portrait image grow to a
// similar size when focused (each just extends along its longer axis).
export const CARD_W = isTouch ? 150 : 240;
export const CARD_H = CARD_W;
export const GAP = isTouch ? 16 : 24;

// Grid pitch: the distance from one card slot to the next.
export const CELL_W = CARD_W + GAP;
export const CELL_H = CARD_H + GAP;

// One "tile" is a COLS x ROWS grid of cards, one per work — see grid.js.
// COLS * ROWS always equals however many works are currently shown, so
// each category tab gets its own tile shape instead of a fixed one.

// Tiles are cloned REPEAT x REPEAT so there's always a buffer of cards
// around the visible area, without creating infinite DOM nodes.
export const REPEAT = 3;

// How strongly the background pattern parallaxes against the drag (0 =
// static, 1 = moves exactly with the cards).
export const PARALLAX = 0.18;

// The base card box aspect ratio (square).
export const BASE_AR = CARD_W / CARD_H;

// How far the cursor's influence reaches, as a multiple of the grid pitch.
// Cards within this radius react to the cursor every frame (nearest = most),
// which is what gives the field its continuous, gradual feel.
export const FIELD_RADIUS = Math.max(CELL_W, CELL_H) * 1.4;

// How much a card gently puffs up at full influence. Every reachable card
// scales a little by proximity (that's the "field"); on top of that, only the
// single nearest card morphs to its full aspect ratio.
export const FIELD_SCALE = 0.16;

// The aspect-morph only ramps in once a card is this centred under the
// pointer, so at the hand-off point between two cards (where influence is
// ~half) neither is mid-morph and the dominant card can swap without a jump.
export const FOCUS_MORPH_START = 0.5;

// A focused card grows to roughly this multiple of the base card's *area*, at
// its image's own aspect ratio — so every aspect ratio swells to a similar
// overall size. FOCUS_GROW is a floor for very tall/wide images so they still
// fully contain the base card. The max multiples keep the box a hair under 2×
// the grid pitch, so two fully-grown cards two slots apart still can't reach
// each other and keeping grid-adjacent tiles apart is enough.
export const FOCUS_AREA = isTouch ? 1.85 : 2.0;
export const FOCUS_GROW = 1.1;
export const FOCUS_MAX_W = 2.05; // × CARD_W
export const FOCUS_MAX_H = 2.05; // × CARD_H
export const FOCUS_LIFT = isTouch ? 8 : 10; // px the focused card floats up

// Smallest gap that must always remain between any two tiles. Nothing ever
// touches.
export const MIN_GAP = isTouch ? 8 : 12;
