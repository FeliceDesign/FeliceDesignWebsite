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
}

// Repeat existing images (round-robin, so we spread across the catalogue rather
// than cloning one photo) until the set exactly fills cols*rows cells.
export function padToGrid(works: Work[], cells: number): Placed[] {
  const placed: Placed[] = works.map((w) => ({
    ...w,
    _origin: w.slug,
    _isVideo: w.media.type === 'video',
  }));

  const images = placed.filter((w) => !w._isVideo);
  const pool = images.length ? images : placed; // degenerate: only videos exist
  let i = 0;
  while (placed.length < cells) {
    const src = pool[i % pool.length];
    placed.push({ ...src }); // shares _origin with its source → shuffle separates them
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

function totalCost(items: Placed[], cols: number, rows: number): number {
  let cost = 0;
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

// Shuffle, then greedily swap pairs to drive the clash cost down.
export function arrange(input: Placed[], cols: number, rows: number, seed = 1): Placed[] {
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
    const before = totalCost(items, cols, rows);
    if (before === 0) break;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        [items[i], items[j]] = [items[j], items[i]];
        const gain = before - totalCost(items, cols, rows);
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

// One call: pad the set to a full grid, then constrained-shuffle it.
export function layout(works: Work[], cols: number, rows: number, cells: number, seed = 1): Work[] {
  return arrange(padToGrid(works, cells), cols, rows, seed);
}
