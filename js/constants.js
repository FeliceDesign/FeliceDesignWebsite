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

// How far the cursor's influence reaches, as a multiple of the grid pitch.
// Cards within this radius react to the cursor every frame (nearest = most),
// which is what gives the field its continuous, gradual feel.
export const FIELD_RADIUS = Math.max(CELL_W, CELL_H) * (isTouch ? 1.5 : 1.6);

// How much a non-dominant card gently puffs up at full influence. Only the
// single nearest card morphs to its full aspect ratio; the rest just scale a
// little by proximity, which is what makes several tiles feel alive without
// several of them ever trying to grow tall at once (which couldn't pack).
export const FIELD_SCALE = 0.16;

// The base card box aspect ratio (all grid cards share it). Hovering a card
// morphs its box towards the image's own aspect ratio, revealing the parts
// that are cropped away in the grid.
export const BASE_AR = CARD_W / CARD_H;

// Focused card growth. The expanded box is the smallest box of the image's
// own aspect ratio that still *contains* the base card, times FOCUS_GROW —
// so a focused card only ever grows outward (revealing the cropped parts),
// never shrinks a side. Then clamped to the viewport and to these multiples
// of the base card so the ripple of pushed neighbours stays a few rings.
// Kept a hair under 2× the grid pitch on purpose: two fully-grown cards two
// slots apart then still can't reach each other, so keeping grid-adjacent
// tiles apart is enough to keep every tile apart.
export const FOCUS_GROW = 1.1;
export const FOCUS_MAX_W = 2.1; // × CARD_W
export const FOCUS_MAX_H = 2.2; // × CARD_H
export const FOCUS_LIFT = 10;   // px the focused card floats up

// Minimum breathing space that must always remain between tiles: FOCUS_GAP
// around the focused card, MIN_GAP between any two ordinary tiles. Nothing
// is ever allowed to touch.
export const FOCUS_GAP = isTouch ? 12 : 18;
export const MIN_GAP = isTouch ? 8 : 12;
