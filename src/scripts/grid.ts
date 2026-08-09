// Picks a COLS x ROWS layout for a given number of cards, and how many cells
// that layout has to fill. Kept in sync with src/lib/grid.ts.
//
// The map tiles a rectangular block infinitely, so the block must be a full
// COLS x ROWS rectangle — a half-empty last row leaves holes and breaks the
// wrap (a prime count like 23 used to collapse to a 23x1 strip). We pick the
// rectangle closest to landscape while wasting few cells; the caller pads the
// works up to cells = cols*rows by repeating images (see arrange.padToGrid).

const PREFERRED_ASPECT = 1.5;

export interface GridShape {
  cols: number;
  rows: number;
  cells: number;
}

export function gridSize(count: number): GridShape {
  if (count <= 1) return { cols: Math.max(1, count), rows: 1, cells: Math.max(1, count) };

  let best: GridShape | null = null;
  let bestScore = Infinity;

  const maxRows = Math.ceil(Math.sqrt(count)) + 1;
  for (let rows = 1; rows <= maxRows; rows++) {
    const cols = Math.ceil(count / rows);
    const cells = cols * rows;
    const waste = cells - count;
    const score = Math.abs(cols / rows - PREFERRED_ASPECT) + waste * 0.35;
    if (score < bestScore) {
      bestScore = score;
      best = { cols, rows, cells };
    }
  }

  return best!;
}
