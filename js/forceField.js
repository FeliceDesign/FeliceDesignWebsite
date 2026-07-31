// Focus field: while the map is standing still, the card under the cursor
// (or, on touch, nearest the screen centre) expands towards its image's own
// aspect ratio — growing to reveal the parts that are cropped in the grid —
// and its neighbours are pushed outward to make room for it. Disabled while
// dragging so panning and expanding never fight each other.
//
// The heavy lifting (easing the size + position changes) is done by CSS
// transitions on `.card`; this module only sets each card's target box and
// offset, and only when the focused card actually changes, so there's no
// per-frame layout thrash.
import {
  CARD_W, CARD_H, BASE_AR, FOCUS_AREA, FOCUS_LIFT, FOCUS_GAP, isTouch,
} from './constants.js';

export class ForceField {
  constructor({ cards, isDragging }) {
    this.cards = cards; // shared, mutated-in-place array owned by the map
    this.isDragging = isDragging;
    this.root = document.documentElement;
    this.mX = -9999; this.mY = -9999;
    this.focused = null; // currently expanded card
    this._raf = false;

    window.addEventListener('mousemove', (e) => {
      this.mX = e.clientX; this.mY = e.clientY;
      if (!this._raf) { this._raf = true; requestAnimationFrame(() => this.apply()); }
    });
    window.addEventListener('mouseup', () => requestAnimationFrame(() => this.apply()));

    if (isTouch) requestAnimationFrame(() => this.apply());
  }

  // The box a focused card grows into: same aspect ratio as its image, and
  // (roughly) FOCUS_AREA times the base card's area, clamped to the viewport.
  _expandedBox(aspect) {
    const area = CARD_W * CARD_H * FOCUS_AREA;
    let w = Math.sqrt(area * aspect);
    let h = Math.sqrt(area / aspect);

    const maxW = window.innerWidth * (isTouch ? 0.82 : 0.6);
    const maxH = window.innerHeight * (isTouch ? 0.6 : 0.82);
    const fit = Math.min(1, maxW / w, maxH / h);
    return { w: w * fit, h: h * fit };
  }

  // Which card should be focused for the current pointer position. On desktop
  // it's simply the card under the cursor; a little hysteresis keeps the
  // current one while the cursor crosses the gap towards a neighbour, so the
  // expansion doesn't flicker off and on. On touch it's the card at centre.
  _pickFocus() {
    const el = document.elementFromPoint(this.mX, this.mY);
    const hit = el && el.closest && el.closest('.card');
    if (hit && hit.style.visibility !== 'hidden') return hit;

    // Hysteresis: keep the current focus while the cursor is still near it.
    if (!isTouch && this.focused && this.focused.isConnected) {
      const r = this.focused.getBoundingClientRect();
      const pad = 28;
      if (this.mX >= r.left - pad && this.mX <= r.right + pad &&
          this.mY >= r.top - pad && this.mY <= r.bottom + pad) {
        return this.focused;
      }
    }
    return null;
  }

  apply() {
    this._raf = false;

    if (isTouch) {
      this.mX = window.innerWidth / 2;
      this.mY = window.innerHeight / 2;
    } else if (this.isDragging()) {
      this.clear();
      return;
    }

    // Cursor glow follows the pointer regardless of focus.
    this.root.style.setProperty('--glow-x', `${this.mX}px`);
    this.root.style.setProperty('--glow-y', `${this.mY}px`);
    this.root.style.setProperty('--glow-a', '0.5');

    const next = this._pickFocus();
    if (next === this.focused) {
      this._updateGlowCard();
      return; // nothing structural changed — CSS is already mid/at target
    }
    this.focused = next;
    this._layout();
    this._updateGlowCard();
  }

  // Positions every card for the current focus: the focused card grows to its
  // full-aspect box (from its centre, lifted a touch), and any card its box
  // overlaps is pushed straight out far enough to clear it, plus a gap.
  //
  // All DOM reads (offsetLeft/Top) happen before any writes, so this never
  // thrashes layout even across the full clone grid.
  _layout() {
    const focused = this.focused;

    if (!focused) {
      for (const card of this.cards) this._reset(card);
      return;
    }

    // --- reads ---
    // Relative offsets within #world are stable no matter how the map is
    // transformed (they're layout positions, not affected by transform or
    // width), so neighbour geometry can be compared directly.
    const fL = focused.offsetLeft;
    const fT = focused.offsetTop;
    const offsets = this.cards.map((card) => ({
      card,
      ox: card.offsetLeft - fL,
      oy: card.offsetTop - fT,
    }));

    // --- writes ---
    const aspect = (focused._work && focused._work.aspect) || BASE_AR;
    const { w, h } = this._expandedBox(aspect);
    const clearX = w / 2 + CARD_W / 2 + FOCUS_GAP;
    const clearY = h / 2 + CARD_H / 2 + FOCUS_GAP;

    const dx = (w - CARD_W) / 2;
    const dy = (h - CARD_H) / 2;
    focused.style.width = `${w}px`;
    focused.style.height = `${h}px`;
    focused.style.transform = `translate(${(-dx).toFixed(1)}px, ${(-dy - FOCUS_LIFT).toFixed(1)}px)`;
    focused.style.zIndex = '50';
    focused.classList.add('focused');

    for (const { card, ox, oy } of offsets) {
      if (card === focused) continue;
      if (card.style.visibility === 'hidden') { this._reset(card); continue; }

      const overlapX = clearX - Math.abs(ox);
      const overlapY = clearY - Math.abs(oy);

      if (overlapX > 0 && overlapY > 0) {
        // Push out along the axis of least overlap (minimum translation),
        // so a card sharing the focused card's row slides sideways and one
        // sharing its column slides up/down.
        let tx = 0; let ty = 0;
        if (overlapX < overlapY) tx = Math.sign(ox || 1) * overlapX;
        else ty = Math.sign(oy || 1) * overlapY;
        card.style.width = `${CARD_W}px`;
        card.style.height = `${CARD_H}px`;
        card.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
        card.style.zIndex = '';
        card.classList.remove('focused');
      } else {
        this._reset(card);
      }
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
