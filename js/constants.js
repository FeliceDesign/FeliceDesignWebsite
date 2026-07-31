// Layout + behaviour tuning shared by the map and the hover force field.

// Touch devices get smaller cards (more fit on screen) and a field that's
// centered on the screen instead of following a cursor.
export const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

export const CARD_W = isTouch ? 190 : 300;
export const CARD_H = isTouch ? 127 : 200; // keeps the 3:2 aspect ratio
export const GAP = isTouch ? 16 : 26;

// One "tile" is a COLS x ROWS grid of cards, one per work — see grid.js.
// COLS * ROWS always equals however many works are currently shown, so
// each category tab gets its own tile shape instead of a fixed one.

// Tiles are cloned REPEAT x REPEAT so there's always a buffer of cards
// around the visible area, without creating infinite DOM nodes.
export const REPEAT = 3;

// How strongly the background pattern parallaxes against the drag (0 =
// static, 1 = moves exactly with the cards).
export const PARALLAX = 0.18;

// Hover force field: how far it reaches, how much cards grow/lift/get
// pushed aside.
export const FIELD_RADIUS = isTouch ? 210 : 300;
export const FIELD_MAX_GROW = 0.20;
export const FIELD_LIFT = 7;
export const FIELD_PUSH = isTouch ? 18 : 26;
