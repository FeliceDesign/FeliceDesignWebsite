// Layout + behaviour tuning shared by the map and the hover force field.
//
// The numbers themselves live in presets.ts — this module picks the desktop or
// touch variant out of the active preset and hands it to the rest of the code
// under stable names.
//
// Live tuning: the ?editor panel (editor.ts) can mutate the active preset's
// layout/field values at runtime and call recompute() to refresh everything
// here. The force field reads the FIELD_* / FOCUS_* / *_GAP values fresh every
// frame, so those take effect instantly; the grid geometry (card size, gap,
// radius) only changes DOM slot positions, so a geometry edit is followed by a
// map rebuild (see editor.ts). Because the derived values below are exported as
// `let`, importers see each recompute() through ES-module live bindings without
// re-importing.
import { PRESET } from './presets';

// Touch devices get smaller cards (more fit on screen) and a field that's
// centered on the screen instead of following a cursor.
export const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

// --- Live-tunable, recomputed geometry -------------------------------------
// Rest cards are square, so a landscape image and a portrait image grow to a
// similar size when focused (each just extends along its longer axis).
export let CARD_W = 0;
export let CARD_H = 0;
export let GAP = 0;
// Rounded corners at rest; the field eases these to 0 (sharp) as a card morphs
// to its full-aspect reveal (forceField.ts).
export let TILE_RADIUS = 0;
// Grid pitch: the distance from one card slot to the next.
export let CELL_W = 0;
export let CELL_H = 0;
// How strongly the background pattern parallaxes against the drag (0 = static,
// 1 = moves exactly with the cards).
export let PARALLAX = 0;
// The base card box aspect ratio (square).
export let BASE_AR = 1;

// --- Live-tunable force-field values ----------------------------------------
// The force field reads FIELD.* fresh every frame, so mutating this object
// takes effect on the next pass with no rebuild. recompute() refills it from
// the active preset.
export const FIELD = {
  // How far the cursor's influence reaches, in px (derived from radiusCells ×
  // the grid pitch). Cards within this radius react to the cursor every frame.
  radius: 0,
  // How much a card gently puffs up at full influence.
  scale: 0,
  // How fast a card's smoothed influence chases its target each frame.
  smooth: 0,
  // The aspect-morph only ramps in once a card is this centred under the pointer.
  morphStart: 0,
  // With the latch on, the reveal is driven by "is the pointer on this card?"
  // instead of by the influence, and holds until the pointer leaves.
  latch: false,
  latchSpeed: 0,
  latchMargin: 0,
  // A focused card grows to roughly this multiple of the base card's *area*, at
  // its image's own aspect ratio. grow is a floor for very tall/wide images;
  // maxW/maxH clamp the box (× card size).
  area: 0,
  grow: 0,
  maxW: 0,
  maxH: 0,
  // px the focused card floats up.
  lift: 0,
  // Clearance between tiles: minGap always applies, approachGap fades in with
  // proximity, focusGap is the extra room around the revealed card.
  minGap: 0,
  approachGap: 0,
  focusGap: 0,
};

// Pull the desktop/touch variant of every tunable value out of the active
// preset. Called once at import, then again by the editor after it mutates the
// preset in place.
export function recompute() {
  const L = PRESET.layout;
  const F = PRESET.field;

  // One global grid zoom applied to card size, gap and radius together, so the
  // whole raster scales without changing its proportions. Defaults to 1.
  const SCALE = L.gridScale ?? 1;

  CARD_W = (isTouch ? L.cardTouch : L.card) * SCALE;
  CARD_H = CARD_W;
  GAP = (isTouch ? L.gapTouch : L.gap) * SCALE;
  TILE_RADIUS = (isTouch ? L.radiusTouch : L.radius) * SCALE;
  CELL_W = CARD_W + GAP;
  CELL_H = CARD_H + GAP;
  PARALLAX = L.parallax;
  BASE_AR = CARD_W / CARD_H;

  FIELD.radius = Math.max(CELL_W, CELL_H) * F.radiusCells;
  FIELD.scale = F.scale;
  FIELD.smooth = isTouch ? F.smoothTouch : F.smooth;
  FIELD.morphStart = F.morphStart;
  FIELD.latch = F.latch && !isTouch;
  FIELD.latchSpeed = F.latchSpeed;
  FIELD.latchMargin = F.latchMargin;
  FIELD.area = isTouch ? F.areaTouch : F.area;
  FIELD.grow = F.grow;
  FIELD.maxW = F.maxW;
  FIELD.maxH = F.maxH;
  FIELD.lift = isTouch ? F.liftTouch : F.lift;
  FIELD.minGap = isTouch ? F.minGapTouch : F.minGap;
  FIELD.approachGap = isTouch ? F.approachGapTouch : F.approachGap;
  FIELD.focusGap = isTouch ? F.focusGapTouch : F.focusGap;
}

recompute();

// One "tile" is a COLS x ROWS grid of cards, one per work — see grid.ts.
// COLS * ROWS always equals however many works are currently shown, so each
// category tab gets its own tile shape instead of a fixed one.
//
// Tiles are cloned REPEAT x REPEAT so there's always a buffer of cards around
// the visible area, without creating infinite DOM nodes.
export const REPEAT = 3;
