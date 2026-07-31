// Focus field: while the map is standing still, the card under the cursor
// (or, on touch, nearest the screen centre) expands towards its image's own
// aspect ratio — growing to reveal the parts that are cropped in the grid —
// and the surrounding tiles are nudged outward to make room for it.
//
// Making room is a small relaxation solve rather than a one-shot shove: the
// expanded card first pushes the tiles it overlaps just far enough to clear
// it, then tiles push apart from one another until nothing overlaps. That
// naturally cascades — the ring touching the focused card moves most, the
// next ring less, trailing off to nothing — and, crucially, guarantees a
// gap everywhere so no two images ever touch or clip.
//
// It runs only when the focused card changes (not every frame), and CSS
// transitions on `.card` ease every card from its old box to its new one,
// which is what makes the whole thing look smooth. Focus is picked from the
// cards' stable grid geometry (never their live, mid-animation rects), so it
// can't flicker as tiles move.
import {
  CARD_W, CARD_H, GAP, CELL_W, CELL_H, BASE_AR,
  FOCUS_GROW, FOCUS_MAX_W, FOCUS_MAX_H, FOCUS_LIFT, FOCUS_GAP, MIN_GAP, isTouch,
} from './constants.js';

export class ForceField {
  constructor({ cards, world, isMoving }) {
    this.cards = cards; // shared, mutated-in-place array owned by the map
    this.world = world; // #world element, for stable on-screen geometry
    this.isMoving = isMoving; // () => bool: map is being dragged or gliding
    this.root = document.documentElement;
    this.mX = -9999; this.mY = -9999;
    this.focused = null;
    this.fw = 0; this.fh = 0; // current focused card's expanded box
    this._raf = false;

    window.addEventListener('mousemove', (e) => {
      this.mX = e.clientX; this.mY = e.clientY;
      if (!this._raf) { this._raf = true; requestAnimationFrame(() => this.apply()); }
    });
    window.addEventListener('mouseup', () => requestAnimationFrame(() => this.apply()));

    if (isTouch) requestAnimationFrame(() => this.apply());
  }

  // The box a focused card grows into: the smallest box of the image's own
  // aspect ratio that still contains the base card (so the card only ever
  // grows outward, revealing the cropped parts, never shrinks a side), times
  // FOCUS_GROW, then clamped to the viewport and the max-size multiples.
  _expandedBox(aspect) {
    let w; let h;
    if (aspect >= BASE_AR) { h = CARD_H; w = CARD_H * aspect; } // wide: grow width
    else { w = CARD_W; h = CARD_W / aspect; }                   // tall: grow height
    w *= FOCUS_GROW; h *= FOCUS_GROW;

    const maxW = Math.min(CARD_W * FOCUS_MAX_W, window.innerWidth * (isTouch ? 0.86 : 0.66));
    const maxH = Math.min(CARD_H * FOCUS_MAX_H, window.innerHeight * (isTouch ? 0.62 : 0.84));
    const fit = Math.min(1, maxW / w, maxH / h); // only ever clamp down, never inflate
    return { w: w * fit, h: h * fit };
  }

  // Stable on-screen centre of a card's *grid slot* — from its layout offset,
  // never its animated size — so focus picking doesn't chase moving tiles.
  _slotCenter(card, worldRect) {
    return {
      x: worldRect.left + card.offsetLeft + CARD_W / 2,
      y: worldRect.top + card.offsetTop + CARD_H / 2,
    };
  }

  _pickFocus() {
    const worldRect = this.world.getBoundingClientRect();

    // 1) Whichever card's grid slot the pointer sits in wins outright, so
    //    moving onto a neighbour switches focus immediately.
    for (const card of this.cards) {
      if (card.style.visibility === 'hidden') continue;
      const c = this._slotCenter(card, worldRect);
      if (Math.abs(this.mX - c.x) <= CARD_W / 2 && Math.abs(this.mY - c.y) <= CARD_H / 2) {
        return card;
      }
    }

    // 2) Pointer is in a gap between slots: keep the current focus as long as
    //    it's still under the footprint the card has grown to. This is what
    //    stops the expansion flickering off while the pointer crosses the
    //    (widened) gap around it.
    if (this.focused && this.focused.isConnected && this.focused.style.visibility !== 'hidden') {
      const c = this._slotCenter(this.focused, worldRect);
      if (Math.abs(this.mX - c.x) <= this.fw / 2 && Math.abs(this.mY - (c.y - FOCUS_LIFT)) <= this.fh / 2) {
        return this.focused;
      }
    }
    return null;
  }

  apply() {
    this._raf = false;

    if (isTouch) {
      // No cursor on touch: the focus is whatever sits at the screen centre.
      this.mX = window.innerWidth / 2;
      this.mY = window.innerHeight / 2;
    }

    // Never rearrange while the map is dragging or gliding — that's both
    // distracting and the main source of flicker. Cards settle into their
    // expanded layout only once the map comes to rest (map.onSettle).
    if (this.isMoving()) { this.clear(); return; }

    this.root.style.setProperty('--glow-x', `${this.mX}px`);
    this.root.style.setProperty('--glow-y', `${this.mY}px`);
    this.root.style.setProperty('--glow-a', '0.5');

    const next = this._pickFocus();
    if (next === this.focused) { this._updateGlowCard(); return; }
    this.focused = next;
    this._layout();
    this._updateGlowCard();
  }

  _layout() {
    const focused = this.focused;
    if (!focused) {
      for (const card of this.cards) this._reset(card);
      return;
    }

    const aspect = (focused._work && focused._work.aspect) || BASE_AR;
    const { w, h } = this._expandedBox(aspect);
    this.fw = w; this.fh = h;

    // Focused card's grid slot (integer col/row within #world) and the
    // half-extents everything else must stay clear of.
    const fCol = Math.round(focused.offsetLeft / CELL_W);
    const fRow = Math.round(focused.offsetTop / CELL_H);
    const clearX = w / 2 + CARD_W / 2 + FOCUS_GAP;
    const clearY = h / 2 + CARD_H / 2 + FOCUS_GAP;
    // Focused centre, including its upward lift, in #world coordinates.
    const fx = focused.offsetLeft + CARD_W / 2;
    const fy = focused.offsetTop + CARD_H / 2 - FOCUS_LIFT;

    // How many rings the displacement can reach before it must decay to zero,
    // given each grid gap only affords GAP - MIN_GAP of "give" per ring.
    const slack = Math.max(1, GAP - MIN_GAP);
    const rings = Math.min(10, 3 + Math.ceil(Math.max(
      (clearX - CELL_W) / slack,
      (clearY - CELL_H) / slack,
    )));

    // Collect the tiles within reach; reset everything else to the grid.
    const nodes = [];
    const byKey = new Map();
    for (const card of this.cards) {
      if (card === focused) continue;
      if (card.style.visibility === 'hidden') { this._reset(card); continue; }
      const col = Math.round(card.offsetLeft / CELL_W);
      const row = Math.round(card.offsetTop / CELL_H);
      if (Math.abs(col - fCol) > rings || Math.abs(row - fRow) > rings) { this._reset(card); continue; }
      const node = { card, col, row, x: card.offsetLeft, y: card.offsetTop, dx: 0, dy: 0 };
      nodes.push(node);
      byKey.set(`${col},${row}`, node);
    }

    // Relax: push out of the focused card, then push tiles apart, repeat.
    // Plenty of passes so the cascade fully converges (it's only a few dozen
    // tiles and only runs when the focused card changes).
    const iterations = rings * 4 + 10;
    for (let it = 0; it < iterations; it++) {
      // 1) clear the expanded focused card
      for (const n of nodes) {
        const cx = n.x + n.dx + CARD_W / 2;
        const cy = n.y + n.dy + CARD_H / 2;
        const ox = cx - fx;
        const oy = cy - fy;
        const overlapX = clearX - Math.abs(ox);
        const overlapY = clearY - Math.abs(oy);
        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) n.dx += Math.sign(ox || 1) * overlapX;
          else n.dy += Math.sign(oy || 1) * overlapY;
        }
      }
      // 2) keep tiles apart from their grid neighbours (each pair once)
      for (const n of nodes) {
        this._separate(n, byKey.get(`${n.col + 1},${n.row}`));
        this._separate(n, byKey.get(`${n.col},${n.row + 1}`));
        this._separate(n, byKey.get(`${n.col + 1},${n.row + 1}`));
        this._separate(n, byKey.get(`${n.col + 1},${n.row - 1}`));
      }
    }

    // Apply. Focused grows from its centre (offsetLeft/Top are unaffected by
    // the transform, so the growth stays anchored) and lifts a touch.
    const gx = (w - CARD_W) / 2;
    const gy = (h - CARD_H) / 2;
    focused.style.width = `${w}px`;
    focused.style.height = `${h}px`;
    focused.style.transform = `translate(${(-gx).toFixed(1)}px, ${(-gy - FOCUS_LIFT).toFixed(1)}px)`;
    focused.style.zIndex = '50';
    focused.classList.add('focused');

    for (const n of nodes) {
      n.card.style.width = `${CARD_W}px`;
      n.card.style.height = `${CARD_H}px`;
      n.card.style.transform = `translate(${n.dx.toFixed(1)}px, ${n.dy.toFixed(1)}px)`;
      n.card.style.zIndex = '';
      n.card.classList.remove('focused');
    }
  }

  // Push two same-size tiles apart along the axis of least overlap until at
  // least MIN_GAP separates them, moving each half the distance.
  _separate(a, b) {
    if (!a || !b) return;
    const ox = (b.x + b.dx) - (a.x + a.dx);
    const oy = (b.y + b.dy) - (a.y + a.dy);
    const overlapX = CARD_W + MIN_GAP - Math.abs(ox);
    const overlapY = CARD_H + MIN_GAP - Math.abs(oy);
    if (overlapX <= 0 || overlapY <= 0) return;
    if (overlapX < overlapY) {
      const s = (Math.sign(ox || 1) * overlapX) / 2;
      a.dx -= s; b.dx += s;
    } else {
      const s = (Math.sign(oy || 1) * overlapY) / 2;
      a.dy -= s; b.dy += s;
    }
  }

  _updateGlowCard() {
    if (this.focused) {
      const r = this.focused.getBoundingClientRect();
      this.root.style.setProperty('--card-x', `${r.left + r.width / 2}px`);
      this.root.style.setProperty('--card-y', `${r.top + r.height / 2}px`);
      this.root.style.setProperty('--card-a', '1');
    } else {
      this.root.style.setProperty('--card-a', '0');
    }
  }

  _reset(card) {
    card.style.width = `${CARD_W}px`;
    card.style.height = `${CARD_H}px`;
    card.style.transform = '';
    card.style.zIndex = '';
    card.classList.remove('focused');
  }

  clear() {
    this.focused = null;
    for (const card of this.cards) this._reset(card);
    this.root.style.setProperty('--glow-a', '0');
    this.root.style.setProperty('--card-a', '0');
  }
}
