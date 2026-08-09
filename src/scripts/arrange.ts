// Constrained shuffle + grid padding for the client map.
//
// Two jobs:
//  1) padToGrid — the map tiles a full COLS x ROWS rectangle, so a set that
//     doesn't fill the rectangle (e.g. 23 works in a 6x4 = 24 grid) is topped
//     up by repeating existing IMAGES (never videos — a repeated video would
//     just multiply the streams we worked to reduce). Each filler is tagged so
//     the shuffle can keep it away from its original.
//  2) arrange — lay everything out so the grid looks random but never puts two
//     "clashing" cards next to each other: no two videos adjacent, no two of
//     the same type touching, and no duplicate next to its twin.
//
// The map tiles this grid infinitely, so column (cols-1) sits next to column 0
// of the next tile and row (rows-1) next to row 0. Adjacency is checked
// TOROIDALLY (wrap-around) so clashes don't reappear at the seams.
//
// Deterministic: same works + same seed → same layout.
import type { Work } from './types';

// Mulberry32 — tiny seeded PRNG so the shuffle is reproducible from a seed.
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The map draws whatever is in a card, but the arranger also needs to know a
// card's "identity" (which original work it came from) so repeated fillers can
// be pushed apart. We hang that on a private field, invisible to the map.
export interface Placed extends Work {
  _origin: string; // slug of the source work — same for a filler and its original
  _isVideo: boolean;
  _filler: boolean; // true for a padded copy (not the catalogue original)
}

// Repeat existing images (round-robin, so we spread across the catalogue rather
// than cloning one photo) until the set exactly fills cols*rows cells.
export function padToGrid(works: Work[], cells: number): Placed[] {
  const placed: Placed[] = works.map((w) => ({
    ...w,
    _origin: w.slug,
    _isVideo: w.media.type === 'video',
    _filler: false,
  }));

  const images = placed.filter((w) => !w._isVideo);
  const pool = images.length ? images : placed; // degenerate: only videos exist
  let i = 0;
  while (placed.length < cells) {
    const src = pool[i % pool.length];
    // Shares _origin with its source (→ shuffle separates them) but is flagged a
    // filler so the arranger can also keep it out of the opening view.
    placed.push({ ...src, _filler: true });
    i++;
  }
  return placed;
}

const NEIGHBORS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

// How bad is it for these two neighbours to touch?
function clashCost(a: Placed, b: Placed): number {
  let cost = 0;
  if (a._origin === b._origin) cost += 12; // a filler next to its own original
  if (a._isVideo && b._isVideo) cost += 10;
  if (a.type === b.type) cost += 3;
  else if (a.tag === b.tag) cost += 1;
  return cost;
}

// The opening viewport shows the tile's top-left corner (the map starts at
// posX/posY = -tileW/-tileH, so on-screen origin = grid cell 0,0). A padded copy
// landing in that block means the very first thing you see is a duplicate of a
// photo shown elsewhere — so fillers get a stiff penalty for sitting there. The
// block is clamped so it can never demand more cells than the grid has.
function openingCost(items: Placed[], cols: number, rows: number, openCols: number, openRows: number): number {
  const oc = Math.min(openCols, cols);
  const or = Math.min(openRows, rows);
  let cost = 0;
  for (let row = 0; row < or; row++) {
    for (let col = 0; col < oc; col++) {
      if (items[row * cols + col]._filler) cost += 20;
    }
  }
  return cost;
}

function totalCost(items: Placed[], cols: number, rows: number, openCols: number, openRows: number): number {
  let cost = openingCost(items, cols, rows, openCols, openRows);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const a = items[row * cols + col];
      for (const [dx, dy] of NEIGHBORS) {
        const nc = (col + dx + cols) % cols;
        const nr = (row + dy + rows) % rows;
        cost += clashCost(a, items[nr * cols + nc]);
      }
    }
  }
  return cost;
}

// Shuffle, then greedily swap pairs to drive the clash cost down. openCols/
// openRows describe the opening-viewport block that fillers are kept out of.
export function arrange(
  input: Placed[], cols: number, rows: number, seed = 1, openCols = 0, openRows = 0,
): Placed[] {
  const rng = makeRng(seed);
  const items = input.slice();

  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  const n = items.length;
  for (let pass = 0; pass < 200; pass++) {
    let best = 0;
    let bi = -1;
    let bj = -1;
    const before = totalCost(items, cols, rows, openCols, openRows);
    if (before === 0) break;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        [items[i], items[j]] = [items[j], items[i]];
        const gain = before - totalCost(items, cols, rows, openCols, openRows);
        if (gain > best) {
          best = gain;
          bi = i;
          bj = j;
        }
        [items[i], items[j]] = [items[j], items[i]];
      }
    }
    if (bi === -1) break;
    [items[bi], items[bj]] = [items[bj], items[bi]];
  }

  return items;
}

// One call: pad the set to a full grid, then constrained-shuffle it. openCols/
// openRows (how many cells the opening viewport spans) keep fillers off the
// first screen.
export function layout(
  works: Work[], cols: number, rows: number, cells: number, seed = 1, openCols = 0, openRows = 0,
): Work[] {
  return arrange(padToGrid(works, cells), cols, rows, seed, openCols, openRows);
}
