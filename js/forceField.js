// Continuous force field. Every frame the pointer moves (or, on touch, as
// cards glide past the fixed screen centre) the field is recomputed from the
// pointer position, so it flows smoothly instead of snapping on and off.
//
// Every nearby card puffs up a little by how close the pointer is — that's
// the field. On top of that, a card that the pointer is well centred on
// morphs from its square grid box towards its image's full aspect ratio. The
// morph only ramps in past a threshold the geometry guarantees just one card
// can cross at a time, so the reveal is always a single card and the packing
// stays solvable.
//
// Each card's influence is low-pass filtered over time rather than read
// straight from the raw distance, so the size eases instead of jittering with
// every micro-movement of the map (which is what you feel on touch as the map
// settles). The filter keeps running via self-scheduled frames until it has
// come to rest.
//
// A light relaxation pass then nudges tiles apart so that, however much any
// of them have grown, none ever overlap or touch.
import {
  CARD_W, CARD_H, CELL_W, CELL_H, BASE_AR, TILE_RADIUS, FIELD_RADIUS, FIELD_SCALE, FOCUS_MORPH_START,
  FOCUS_AREA, FOCUS_GROW, FOCUS_MAX_W, FOCUS_MAX_H, FOCUS_LIFT, MIN_GAP, isTouch,
} from './constants.js';

// How fast a card's smoothed influence chases its target each frame (lower =
// smoother but laggier). Touch is smoothed harder since the map's settling
// glide is the jittery input there.
const SMOOTH = isTouch ? 0.16 : 0.3;

// How far out tiles are considered each frame — the influence radius, half
// the biggest a card can grow, plus a few rings for its push to cascade to
// zero. With the wide gaps here the per-gap slack is large, so that cascade
// is barely a ring; keeping this tight is what keeps the node count (and the
// per-frame work) small.
const GATHER = FIELD_RADIUS + Math.max(CARD_W * FOCUS_MAX_W, CARD_H * FOCUS_MAX_H) / 2 + 2 * Math.max(CELL_W, CELL_H);

export class ForceField {
  constructor({ cards, map, isDragging }) {
    this.cards = cards;
    this.map = map; // read the world's live translate without forcing layout
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
    // #world is translate(posX, posY) inside a fixed, top-left viewport, so
    // its on-screen origin is exactly the map's position — no getBounding
    // ClientRect (which would force a synchronous layout every frame).
    const wl = this.map.posX;
    const wt = this.map.posY;

    // 1) Gather reachable cards. Each card's raw target influence comes from
    //    the pointer distance; its smoothed influence eases toward that.
    const nodes = [];
    const byKey = new Map();
    let primary = null;
    let primaryInfl = 0;
    let easing = false;

    for (const card of this.cards) {
      if (card.style.visibility === 'hidden') continue;
      const cx = wl + card._ox + CARD_W / 2;
      const cy = wt + card._oy + CARD_H / 2;
      const dist = Math.hypot(this.mX - cx, this.mY - cy);
      if (dist > GATHER) continue;

      const t = Math.max(0, 1 - dist / FIELD_RADIUS);
      const raw = t * t;
      const prev = card._si || 0;
      const infl = prev + (raw - prev) * SMOOTH;
      card._si = infl;
      if (Math.abs(raw - infl) > 0.002) easing = true;

      const node = {
        card, col: card._col, row: card._row, x: card._ox, y: card._oy,
        infl, d: dist, w: CARD_W, h: CARD_H, scale: 1, morph: 0, dom: false, dx: 0, dy: 0,
      };
      nodes.push(node);
      byKey.set(`${node.col},${node.row}`, node);
      if (infl > primaryInfl) { primaryInfl = infl; primary = node; }
    }

    // Resolve each node's grid neighbours to direct object references ONCE
    // (not once per relaxation iteration) — building string map-keys in the
    // inner loop was the bulk of the per-frame cost.
    for (const n of nodes) {
      n.nR = byKey.get(`${n.col + 1},${n.row}`);
      n.nD = byKey.get(`${n.col},${n.row + 1}`);
      n.nDR = byKey.get(`${n.col + 1},${n.row + 1}`);
      n.nUR = byKey.get(`${n.col + 1},${n.row - 1}`);
    }

    // Relax nearest-the-pointer first so a big card's push cascades outward
    // within a single pass.
    nodes.sort((a, b) => a.d - b.d);

    // 2) Size each node from its own smoothed influence: everyone scales
    //    gently; a card centred enough to cross the morph threshold also grows
    //    toward its full aspect box. The threshold is set so only one card can
    //    be morphing at a time.
    for (const n of nodes) {
      if (n.infl <= 0.001) continue;
      n.scale = 1 + FIELD_SCALE * n.infl;
      n.w = CARD_W * n.scale;
      n.h = CARD_H * n.scale;
      const morph = this._morph(n.infl);
      if (morph > 0.02) {
        const full = this._fullBox((n.card._work && n.card._work.aspect) || BASE_AR);
        n.w += (full.w - n.w) * morph;
        n.h += (full.h - n.h) * morph;
        n.morph = morph;
        n.dom = true;
      }
    }

    // 3) Relax: push grid-neighbours apart until every pair keeps MIN_GAP.
    //    Fixed push direction per grid relationship keeps the cascade stable.
    const iterations = 8 + Math.round(primaryInfl * 8);
    for (let it = 0; it < iterations; it++) {
      for (const n of nodes) {
        this._separate(n, n.nR, 'x');
        this._separate(n, n.nD, 'y');
        this._separate(n, n.nDR, 'min');
        this._separate(n, n.nUR, 'min');
      }
    }

    // 4) Apply. A morphing card resizes (growing from its centre); the rest
    //    scale in place. Sub-pixel values keep the motion smooth.
    const touched = new Set();
    for (const n of nodes) {
      if (n.infl <= 0.002 && n.dx === 0 && n.dy === 0) continue;
      const lift = -FOCUS_LIFT * n.infl;
      if (n.dom) {
        const tx = n.dx - (n.w - CARD_W) / 2;
        const ty = n.dy - (n.h - CARD_H) / 2 + lift;
        n.card.style.width = `${n.w.toFixed(2)}px`;
        n.card.style.height = `${n.h.toFixed(2)}px`;
        n.card.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`;
      } else {
        n.card.style.width = `${CARD_W}px`;
        n.card.style.height = `${CARD_H}px`;
        n.card.style.transform =
          `translate(${n.dx.toFixed(2)}px, ${(n.dy + lift).toFixed(2)}px) scale(${n.scale.toFixed(3)})`;
      }
      // Corners ease from rounded (rest) to sharp as the card reveals itself.
      n.card.style.borderRadius = `${(TILE_RADIUS * (1 - n.morph)).toFixed(1)}px`;
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

    // Keep filtering until the smoothed influences have caught up, even if no
    // pointer/map event fires in the meantime.
    if (easing) { this._raf = true; requestAnimationFrame(() => this.apply()); }
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

    let ax = axis;
    if (axis === 'min') {
      // Decide the push axis from the STATIC grid offsets (no displacement),
      // so it's fixed for the whole frame and can't flip between iterations
      // (which would oscillate) — the shallower one clears with least motion.
      const soX = (a.w + b.w) / 2 + MIN_GAP - Math.abs(b.x - a.x);
      const soY = (a.h + b.h) / 2 + MIN_GAP - Math.abs(b.y - a.y);
      ax = soX < soY ? 'x' : 'y';
    }
    if (ax === 'x') {
      const s = (Math.sign(ox || 1) * overlapX) / 2;
      a.dx -= s; b.dx += s;
    } else {
      const s = (Math.sign(oy || 1) * overlapY) / 2;
      a.dy -= s; b.dy += s;
    }
  }

  _reset(card) {
    card._si = 0;
    card.style.width = `${CARD_W}px`;
    card.style.height = `${CARD_H}px`;
    card.style.transform = '';
    card.style.borderRadius = `${TILE_RADIUS}px`;
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
