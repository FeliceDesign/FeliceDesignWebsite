// Continuous force field. Every frame the pointer moves (or, on touch, as
// cards glide past the fixed screen centre) the field is recomputed from the
// pointer position, so it flows smoothly instead of snapping on and off.
//
// Every nearby card reacts by how close the pointer is: the single nearest
// card (the "dominant" one) morphs from its cropped grid box towards its
// image's full aspect ratio, while all the other nearby cards just puff up a
// little by proximity. Reserving the big aspect reveal for one card at a time
// keeps several tiles feeling alive without several of them ever trying to
// grow tall at once — which could never pack without overlapping.
//
// A light relaxation pass then nudges tiles apart so that, however much any
// of them have grown, none ever overlap or touch.
import {
  CARD_W, CARD_H, CELL_W, CELL_H, BASE_AR, FIELD_RADIUS, FIELD_SCALE,
  FOCUS_GROW, FOCUS_MAX_W, FOCUS_MAX_H, FOCUS_LIFT, MIN_GAP, isTouch,
} from './constants.js';

// Beyond the influence radius, cards can still get shoved aside to clear a
// big neighbour, so we consider tiles within this larger gather radius.
const GATHER = FIELD_RADIUS + Math.max(CARD_W * FOCUS_MAX_W, CARD_H * FOCUS_MAX_H) + 2 * Math.max(CELL_W, CELL_H);

export class ForceField {
  constructor({ cards, world, isDragging }) {
    this.cards = cards;
    this.world = world;
    this.isDragging = isDragging;
    this.root = document.documentElement;
    this.mX = -9999; this.mY = -9999;
    this._raf = false;
    this._touched = new Set(); // cards we styled last frame (to cheaply reset)

    window.addEventListener('mousemove', (e) => {
      this.mX = e.clientX; this.mY = e.clientY;
      if (!this._raf) { this._raf = true; requestAnimationFrame(() => this.apply()); }
    });
    window.addEventListener('mouseup', () => requestAnimationFrame(() => this.apply()));

    if (isTouch) requestAnimationFrame(() => this.apply());
  }

  // The box a card would grow to if fully focused: the smallest box of its
  // image's aspect ratio that still contains the base card (so it only ever
  // grows outward), times FOCUS_GROW, clamped to the viewport and max sizes.
  _fullBox(aspect) {
    let w; let h;
    if (aspect >= BASE_AR) { h = CARD_H; w = CARD_H * aspect; }
    else { w = CARD_W; h = CARD_W / aspect; }
    w *= FOCUS_GROW; h *= FOCUS_GROW;
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

    // 1) Read every reachable card and give it an influence (0..1) from how
    //    close the pointer is. Find the single most-influenced ("dominant")
    //    card — the only one that morphs to its full aspect ratio.
    const nodes = [];
    const byKey = new Map();
    let primary = null;
    let primaryInfl = 0;

    for (const card of this.cards) {
      if (card.style.visibility === 'hidden') continue;
      const cx = worldRect.left + card.offsetLeft + CARD_W / 2;
      const cy = worldRect.top + card.offsetTop + CARD_H / 2;
      const dist = Math.hypot(this.mX - cx, this.mY - cy);
      if (dist > GATHER) continue;

      const t = Math.max(0, 1 - dist / FIELD_RADIUS);
      const infl = t * t; // ease: far cards barely react
      const node = {
        card,
        col: Math.round(card.offsetLeft / CELL_W),
        row: Math.round(card.offsetTop / CELL_H),
        x: card.offsetLeft, y: card.offsetTop,
        infl, w: CARD_W, h: CARD_H, scale: 1, dom: false, dx: 0, dy: 0,
      };
      nodes.push(node);
      byKey.set(`${node.col},${node.row}`, node);
      if (infl > primaryInfl) { primaryInfl = infl; primary = node; }
    }

    // 2) Size each node. The dominant card morphs towards its full aspect box
    //    (by its own influence); every other card just scales up a little.
    for (const n of nodes) {
      if (n.infl <= 0) continue;
      if (n === primary) {
        const full = this._fullBox((n.card._work && n.card._work.aspect) || BASE_AR);
        n.w = CARD_W + (full.w - CARD_W) * n.infl;
        n.h = CARD_H + (full.h - CARD_H) * n.infl;
        n.dom = true;
      } else {
        n.scale = 1 + FIELD_SCALE * n.infl;
        n.w = CARD_W * n.scale; // effective size for keeping tiles apart
        n.h = CARD_H * n.scale;
      }
    }

    // 3) Relax: push grid-neighbours apart until every pair keeps MIN_GAP,
    //    given their grown sizes. Deeper when the dominant card is strongly
    //    expanded, cheaper when the field is calm.
    const iterations = 12 + Math.round(primaryInfl * 22);
    for (let it = 0; it < iterations; it++) {
      for (const n of nodes) {
        this._separate(n, byKey.get(`${n.col + 1},${n.row}`));
        this._separate(n, byKey.get(`${n.col},${n.row + 1}`));
        this._separate(n, byKey.get(`${n.col + 1},${n.row + 1}`));
        this._separate(n, byKey.get(`${n.col + 1},${n.row - 1}`));
      }
    }

    // 4) Apply. The dominant card resizes and grows from its own centre; the
    //    rest scale in place. Both are translated by the relaxation push and
    //    lifted in proportion to their influence.
    const touched = new Set();
    for (const n of nodes) {
      if (n.infl <= 0 && n.dx === 0 && n.dy === 0) continue; // untouched: leave as base
      const lift = -FOCUS_LIFT * n.infl;
      if (n.dom) {
        const gx = (n.w - CARD_W) / 2;
        const gy = (n.h - CARD_H) / 2;
        n.card.style.width = `${n.w.toFixed(1)}px`;
        n.card.style.height = `${n.h.toFixed(1)}px`;
        n.card.style.transform =
          `translate(${(n.dx - gx).toFixed(1)}px, ${(n.dy - gy + lift).toFixed(1)}px)`;
      } else {
        n.card.style.width = `${CARD_W}px`;
        n.card.style.height = `${CARD_H}px`;
        n.card.style.transform =
          `translate(${n.dx.toFixed(1)}px, ${(n.dy + lift).toFixed(1)}px) scale(${n.scale.toFixed(3)})`;
      }
      n.card.style.zIndex = String(5 + Math.round(n.infl * 40));
      n.card.classList.toggle('focused', n === primary && primaryInfl > 0.45);
      touched.add(n.card);
    }
    // Reset whatever we grew last frame but aren't touching now.
    for (const card of this._touched) if (!touched.has(card)) this._reset(card);
    this._touched = touched;

    // Card glow tracks the dominant card.
    if (primary && primaryInfl > 0.05) {
      const cx = worldRect.left + primary.x + CARD_W / 2 + primary.dx;
      const cy = worldRect.top + primary.y + CARD_H / 2 + primary.dy - FOCUS_LIFT * primary.infl;
      this.root.style.setProperty('--card-x', `${cx.toFixed(0)}px`);
      this.root.style.setProperty('--card-y', `${cy.toFixed(0)}px`);
      this.root.style.setProperty('--card-a', primaryInfl.toFixed(3));
    } else {
      this.root.style.setProperty('--card-a', '0');
    }
  }

  // Push two tiles apart along the axis of least overlap until at least
  // MIN_GAP separates their (grown) boxes, splitting the move between them.
  _separate(a, b) {
    if (!a || !b) return;
    const ox = (b.x + b.dx) - (a.x + a.dx);
    const oy = (b.y + b.dy) - (a.y + a.dy);
    const overlapX = (a.w + b.w) / 2 + MIN_GAP - Math.abs(ox);
    const overlapY = (a.h + b.h) / 2 + MIN_GAP - Math.abs(oy);
    if (overlapX <= 0 || overlapY <= 0) return;
    if (overlapX < overlapY) {
      const s = (Math.sign(ox || 1) * overlapX) / 2;
      a.dx -= s; b.dx += s;
    } else {
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
