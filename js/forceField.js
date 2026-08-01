// Continuous force field. Every frame the pointer moves (or, on touch, as
// cards glide past the fixed screen centre) the field is recomputed from the
// pointer position, so it flows smoothly instead of snapping on and off.
//
// Every nearby card puffs up a little by how close the pointer is — that's
// the field. On top of that, the single nearest card (once the pointer is
// well centred on it) morphs from its square grid box towards its image's
// full aspect ratio. Reserving the aspect reveal for one card at a time, and
// only ramping it in past the hand-off point, keeps the packing solvable and
// lets the dominant card swap from one tile to the next without a jump.
//
// A light relaxation pass then nudges tiles apart so that, however much any
// of them have grown, none ever overlap or touch.
import {
  CARD_W, CARD_H, CELL_W, CELL_H, BASE_AR, FIELD_RADIUS, FIELD_SCALE, FOCUS_MORPH_START,
  FOCUS_AREA, FOCUS_GROW, FOCUS_MAX_W, FOCUS_MAX_H, FOCUS_LIFT, MIN_GAP, isTouch,
} from './constants.js';

// How far out tiles are still considered — the influence radius plus enough
// rings for a fully-grown card's push to fade out.
const GATHER = FIELD_RADIUS + Math.max(CARD_W * FOCUS_MAX_W, CARD_H * FOCUS_MAX_H) + 4 * Math.max(CELL_W, CELL_H);

export class ForceField {
  constructor({ cards, world, isDragging }) {
    this.cards = cards;
    this.world = world;
    this.isDragging = isDragging;
    this.root = document.documentElement;
    this.mX = -9999; this.mY = -9999;
    this._raf = false;
    this._touched = new Set();

    window.addEventListener('mousemove', (e) => {
      this.mX = e.clientX; this.mY = e.clientY;
      if (!this._raf) { this._raf = true; requestAnimationFrame(() => this.apply()); }
    });
    window.addEventListener('mouseup', () => requestAnimationFrame(() => this.apply()));

    if (isTouch) requestAnimationFrame(() => this.apply());
  }

  // The box a card grows to when fully focused, at its image's aspect ratio:
  // the larger of a target-area box (so every aspect ends a similar size) and
  // a contain-the-base box (a floor for very tall/wide images), then clamped.
  _fullBox(aspect) {
    const area = CARD_W * CARD_H * FOCUS_AREA;
    const aw = Math.sqrt(area * aspect);
    const ah = Math.sqrt(area / aspect);
    let cw; let ch;
    if (aspect >= BASE_AR) { ch = CARD_H; cw = CARD_H * aspect; }
    else { cw = CARD_W; ch = CARD_W / aspect; }
    let w = Math.max(aw, cw * FOCUS_GROW);
    let h = Math.max(ah, ch * FOCUS_GROW);
    const maxW = Math.min(CARD_W * FOCUS_MAX_W, window.innerWidth * (isTouch ? 0.86 : 0.66));
    const maxH = Math.min(CARD_H * FOCUS_MAX_H, window.innerHeight * (isTouch ? 0.62 : 0.84));
    const fit = Math.min(1, maxW / w, maxH / h);
    return { w: w * fit, h: h * fit };
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

    this.root.style.setProperty('--glow-x', `${this.mX}px`);
    this.root.style.setProperty('--glow-y', `${this.mY}px`);
    this.root.style.setProperty('--glow-a', '0.5');

    this._field();
  }

  _field() {
    const worldRect = this.world.getBoundingClientRect();
    const wl = worldRect.left;
    const wt = worldRect.top;

    // 1) Gather reachable cards with their influence; find the dominant one.
    const nodes = [];
    const byKey = new Map();
    let primary = null;
    let primaryInfl = 0;

    for (const card of this.cards) {
      if (card.style.visibility === 'hidden') continue;
      const cx = wl + card._ox + CARD_W / 2;
      const cy = wt + card._oy + CARD_H / 2;
      const dist = Math.hypot(this.mX - cx, this.mY - cy);
      if (dist > GATHER) continue;

      const t = Math.max(0, 1 - dist / FIELD_RADIUS);
      const infl = t * t;
      const node = {
        card, col: card._col, row: card._row, x: card._ox, y: card._oy,
        infl, w: CARD_W, h: CARD_H, scale: 1, dom: false, dx: 0, dy: 0,
      };
      nodes.push(node);
      byKey.set(`${node.col},${node.row}`, node);
      if (infl > primaryInfl) { primaryInfl = infl; primary = node; }
    }

    // 2) Size each node: everyone scales gently by influence; the dominant
    //    card additionally morphs toward its full box, but only past the
    //    hand-off point (so a swap between tiles doesn't pop).
    for (const n of nodes) {
      if (n.infl <= 0) continue;
      n.scale = 1 + FIELD_SCALE * n.infl;
      n.w = CARD_W * n.scale;
      n.h = CARD_H * n.scale;
      if (n === primary) {
        const morph = this._morph(n.infl);
        if (morph > 0) {
          const full = this._fullBox((n.card._work && n.card._work.aspect) || BASE_AR);
          n.w += (full.w - n.w) * morph;
          n.h += (full.h - n.h) * morph;
          n.dom = true;
        }
      }
    }

    // 3) Relax: push grid-neighbours apart until every pair keeps MIN_GAP.
    //    Fixed push direction per grid relationship keeps the cascade stable.
    const iterations = 12 + Math.round(primaryInfl * 18);
    for (let it = 0; it < iterations; it++) {
      for (const n of nodes) {
        this._separate(n, byKey.get(`${n.col + 1},${n.row}`), 'x');
        this._separate(n, byKey.get(`${n.col},${n.row + 1}`), 'y');
        this._separate(n, byKey.get(`${n.col + 1},${n.row + 1}`), 'both');
        this._separate(n, byKey.get(`${n.col + 1},${n.row - 1}`), 'both');
      }
    }

    // 4) Apply. The dominant card resizes (growing from its centre); the rest
    //    scale in place. Values are rounded to whole pixels to avoid shimmer.
    const touched = new Set();
    for (const n of nodes) {
      if (n.infl <= 0 && n.dx === 0 && n.dy === 0) continue;
      const lift = Math.round(-FOCUS_LIFT * n.infl);
      if (n.dom) {
        const w = Math.round(n.w);
        const h = Math.round(n.h);
        const tx = Math.round(n.dx - (w - CARD_W) / 2);
        const ty = Math.round(n.dy - (h - CARD_H) / 2) + lift;
        n.card.style.width = `${w}px`;
        n.card.style.height = `${h}px`;
        n.card.style.transform = `translate(${tx}px, ${ty}px)`;
      } else {
        n.card.style.width = `${CARD_W}px`;
        n.card.style.height = `${CARD_H}px`;
        n.card.style.transform =
          `translate(${Math.round(n.dx)}px, ${Math.round(n.dy) + lift}px) scale(${n.scale.toFixed(3)})`;
      }
      n.card.style.zIndex = String(5 + Math.round(n.infl * 40));
      n.card.classList.toggle('focused', n === primary && primaryInfl > 0.45);
      touched.add(n.card);
    }
    for (const card of this._touched) if (!touched.has(card)) this._reset(card);
    this._touched = touched;

    if (primary && primaryInfl > 0.05) {
      const cx = wl + primary.x + CARD_W / 2 + primary.dx;
      const cy = wt + primary.y + CARD_H / 2 + primary.dy - FOCUS_LIFT * primary.infl;
      this.root.style.setProperty('--card-x', `${cx.toFixed(0)}px`);
      this.root.style.setProperty('--card-y', `${cy.toFixed(0)}px`);
      this.root.style.setProperty('--card-a', primaryInfl.toFixed(3));
    } else {
      this.root.style.setProperty('--card-a', '0');
    }
  }

  // Smoothstep from FOCUS_MORPH_START..1 -> 0..1: no morph until the pointer
  // is fairly centred, easing in to a full reveal at the centre.
  _morph(infl) {
    const t = Math.max(0, Math.min(1, (infl - FOCUS_MORPH_START) / (1 - FOCUS_MORPH_START)));
    return t * t * (3 - 2 * t);
  }

  _separate(a, b, axis) {
    if (!a || !b) return;
    const ox = (b.x + b.dx) - (a.x + a.dx);
    const oy = (b.y + b.dy) - (a.y + a.dy);
    const overlapX = (a.w + b.w) / 2 + MIN_GAP - Math.abs(ox);
    const overlapY = (a.h + b.h) / 2 + MIN_GAP - Math.abs(oy);
    if (overlapX <= 0 || overlapY <= 0) return;
    if (axis === 'x' || axis === 'both') {
      const s = (Math.sign(ox || 1) * overlapX) / 2;
      a.dx -= s; b.dx += s;
    }
    if (axis === 'y' || axis === 'both') {
      const s = (Math.sign(oy || 1) * overlapY) / 2;
      a.dy -= s; b.dy += s;
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
    for (const card of this._touched) this._reset(card);
    this._touched = new Set();
    this.root.style.setProperty('--glow-a', '0');
    this.root.style.setProperty('--card-a', '0');
  }
}
