// Layout + behaviour tuning shared by the map and the hover force field.

// Touch devices get smaller cards (more fit on screen) and a field that's
// centered on the screen instead of following a cursor.
export const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

export const CARD_W = isTouch ? 190 : 300;
export const CARD_H = isTouch ? 127 : 200; // keeps the 3:2 aspect ratio
export const GAP = isTouch ? 16 : 26;

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

// The base card box aspect ratio (all grid cards share it). Hovering a card
// morphs its box towards the image's own aspect ratio, revealing the parts
// that are cropped away in the grid.
export const BASE_AR = CARD_W / CARD_H;

// Focused card: how much bigger it gets. The expanded card keeps roughly
// this multiple of the base card's *area* (so a tall image and a wide image
// end up feeling like the same amount of "zoom", just in different shapes),
// then clamped so it never grows more than these multiples of the base card
// (which keeps the ripple of pushed neighbours to a handful of rings).
export const FOCUS_AREA = isTouch ? 1.75 : 2.0;
export const FOCUS_MAX_W = 1.9; // × CARD_W
export const FOCUS_MAX_H = 1.7; // × CARD_H
export const FOCUS_LIFT = 10;   // px the focused card floats up

// Minimum breathing space that must always remain between tiles: FOCUS_GAP
// around the focused card, MIN_GAP between any two ordinary tiles. Nothing
// is ever allowed to touch.
export const FOCUS_GAP = isTouch ? 12 : 18;
export const MIN_GAP = isTouch ? 8 : 12;
