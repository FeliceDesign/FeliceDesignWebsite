// Picks a COLS x ROWS layout for a given number of cards. Each category tab
// shows its own grid built only from its own works, so this has to work for
// whatever count that category happens to have — not just a fixed 24.

// Cards are landscape (roughly 3:2), so a wider-than-tall grid reads best.
const PREFERRED_ASPECT = 1.5;

export function gridSize(count) {
  let best = { cols: count, rows: 1 };
  let bestScore = Infinity;

  for (let rows = 1; rows * rows <= count; rows++) {
    if (count % rows !== 0) continue;
    const cols = count / rows;
    const score = Math.abs(cols / rows - PREFERRED_ASPECT);
    if (score < bestScore) { bestScore = score; best = { cols, rows }; }
  }

  return best;
}
