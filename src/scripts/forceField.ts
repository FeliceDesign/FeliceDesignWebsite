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
import { CARD_W, CARD_H, CELL_W, CELL_H, BASE_AR, TILE_RADIUS, FIELD, isTouch } from './constants';
import { aspectOf } from './aspect';

// How far out tiles are considered each frame — the influence radius, half the
// biggest a card can grow, plus a few rings for its push to cascade to zero.
// With the wide gaps here the per-gap slack is large, so that cascade is barely
// a ring; keeping this tight is what keeps the node count (and the per-frame
// work) small. Recomputed each pass so live edits to the field/grid apply at
// once. (CARD_W etc. are live bindings; FIELD is a live object — see
// constants.ts.)
function gather() {
  return FIELD.radius
    + Math.max(CARD_W * FIELD.maxW, CARD_H * FIELD.maxH) / 2
    + 2 * Math.max(CELL_W, CELL_H);
}

export class ForceField {
  constructor({ cards, map, isDragging }) {
    this.cards = cards;
    this.map = map; // read the world's live translate without forcing layout
    this.isDragging = isDragging;
    this.root = document.documentElement;
    this.mX = -9999; this.mY = -9999;
    this._raf = false;
    this._touched = new Set();
    // The card the pointer is currently ON (not merely near). While one is
    // held its reveal stays at full, so the shape can't shift under the hand.
    this._latch = null;

    window.addEventListener('mousemove', (e) => {
      this.mX = e.clientX; this.mY = e.clientY;
      this.apply();
    });
    window.addEventListener('mouseup', () => this.apply());

    if (isTouch) this.apply();
  }

  // Ask for a field pass. Coalesced to exactly one per animation frame no
  // matter how many callers ask — the pointer, the map's glide ticks and the
  // field's own easing all want one in the same frame, and stepping the
  // smoothing filter a variable number of times per frame is what made
  // settling cards stutter instead of easing evenly.
  apply() {
    if (this._raf) return;
    this._raf = true;
    requestAnimationFrame(() => this._pass());
  }

  // The box a card grows to when fully focused, at its image's aspect ratio:
  // the larger of a target-area box (so every aspect ends a similar size) and
  // a contain-the-base box (a floor for very tall/wide images), then clamped.
  _fullBox(aspect) {
    const area = CARD_W * CARD_H * FIELD.area;
    const aw = Math.sqrt(area * aspect);
    const ah = Math.sqrt(area / aspect);
    let cw; let ch;
    if (aspect >= BASE_AR) { ch = CARD_H; cw = CARD_H * aspect; }
    else { cw = CARD_W; ch = CARD_W / aspect; }
    let w = Math.max(aw, cw * FIELD.grow);
    let h = Math.max(ah, ch * FIELD.grow);
    const maxW = Math.min(CARD_W * FIELD.maxW, window.innerWidth * (isTouch ? 0.86 : 0.66));
    const maxH = Math.min(CARD_H * FIELD.maxH, window.innerHeight * (isTouch ? 0.62 : 0.84));
    const fit = Math.min(1, maxW / w, maxH / h);
    return { w: w * fit, h: h * fit };
  }

  // Is the pointer on this card as it is currently drawn? Measured from what
  // the field applied last frame — the field is the only thing that moves or
  // resizes cards, so this needs no layout read. The box is never smaller
  // than the resting card, so a card can't shrink out from under the pointer
  // and start flickering.
  _onCard(card, wl, wt, margin) {
    const w = Math.max(card._lw || 0, CARD_W) / 2 + margin;
    const h = Math.max(card._lh || 0, CARD_H) / 2 + margin;
    const cx = wl + card._ox + CARD_W / 2 + (card._ldx || 0);
    const cy = wt + card._oy + CARD_H / 2 + (card._ldy || 0);
    return Math.abs(this.mX - cx) <= w && Math.abs(this.mY - cy) <= h;
  }

  _pass() {
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
    const GATHER = gather();

    for (const card of this.cards) {
      if (card.style.visibility === 'hidden') continue;
      const cx = wl + card._ox + CARD_W / 2;
      const cy = wt + card._oy + CARD_H / 2;
      const dist = Math.hypot(this.mX - cx, this.mY - cy);
      if (dist > GATHER) continue;

      const t = Math.max(0, 1 - dist / FIELD.radius);
      const raw = t * t;
      const prev = card._si || 0;
      const infl = prev + (raw - prev) * FIELD.smooth;
      card._si = infl;
      if (Math.abs(raw - infl) > 0.002) easing = true;

      const node = {
        card, col: card._col, row: card._row, x: card._ox, y: card._oy,
        infl, d: dist, w: CARD_W, h: CARD_H, scale: 1, morph: 0, dom: false, dx: 0, dy: 0, gapBias: 0,
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

    // Latch: whichever card the pointer is physically on owns the reveal, and
    // keeps it until the pointer leaves that card — so once you're on an
    // image its aspect ratio stops changing. Each card eases its own progress,
    // so moving from one card to the next crossfades instead of snapping.
    if (FIELD.latch) {
      const held = this._latch;
      const keep = held && held.isConnected && held.style.visibility !== 'hidden'
        && this._onCard(held, wl, wt, FIELD.latchMargin);
      if (!keep) {
        this._latch = null;
        for (const n of nodes) { // sorted, so this is the nearest one
          if (this._onCard(n.card, wl, wt, 0)) { this._latch = n.card; break; }
        }
      }
      for (const n of nodes) {
        const target = n.card === this._latch ? 1 : 0;
        const from = n.card._mp || 0;
        const next = from + (target - from) * FIELD.latchSpeed;
        n.card._mp = Math.abs(target - next) < 0.002 ? target : next;
        if (n.card._mp !== target) easing = true;
      }
    }

    // 2) Size each node from its own smoothed influence: everyone scales
    //    gently; a card centred enough to cross the morph threshold also grows
    //    toward its full aspect box. The threshold is set so only one card can
    //    be morphing at a time.
    for (const n of nodes) {
      const morph = FIELD.latch ? (n.card._mp || 0) : this._morph(n.infl);
      if (n.infl <= 0.001 && morph <= 0.02) continue;
      n.scale = 1 + FIELD.scale * n.infl;
      n.w = CARD_W * n.scale;
      n.h = CARD_H * n.scale;
      if (morph > 0.02) {
        const full = this._fullBox((n.card._work && aspectOf(n.card._work)) || BASE_AR);
        n.w += (full.w - n.w) * morph;
        n.h += (full.h - n.h) * morph;
        n.morph = morph;
        n.dom = true;
      }
      // Extra clearance this card asks its neighbours for: some of it fades
      // in with mere proximity (so they start making room early), the rest
      // belongs to the card being revealed.
      n.gapBias = FIELD.approachGap * n.infl + FIELD.focusGap * n.morph;
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
    let latchNode = null;
    for (const n of nodes) {
      if (n.card === this._latch) latchNode = n;
      if (n.infl <= 0.002 && n.morph === 0 && n.dx === 0 && n.dy === 0) continue;
      const lift = -FIELD.lift * n.infl;
      // translate3d, and will-change while it moves, put the card on its own
      // compositor layer: the offsets below are fractional, and an unpromoted
      // layer would round them to whole device pixels, which is what makes a
      // settling card look like it's ticking across a grid.
      if (n.card.style.willChange !== 'transform') n.card.style.willChange = 'transform';
      if (n.dom) {
        const tx = n.dx - (n.w - CARD_W) / 2;
        const ty = n.dy - (n.h - CARD_H) / 2 + lift;
        n.card.style.width = `${n.w.toFixed(2)}px`;
        n.card.style.height = `${n.h.toFixed(2)}px`;
        n.card.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
      } else {
        n.card.style.width = `${CARD_W}px`;
        n.card.style.height = `${CARD_H}px`;
        n.card.style.transform =
          `translate3d(${n.dx.toFixed(2)}px, ${(n.dy + lift).toFixed(2)}px, 0) scale(${n.scale.toFixed(3)})`;
      }
      // Corners ease from rounded (rest) to sharp as the card reveals itself.
      n.card.style.borderRadius = `${(TILE_RADIUS * (1 - n.morph)).toFixed(1)}px`;
      const z = String(5 + Math.round(n.infl * 40));
      if (n.card.style.zIndex !== z) n.card.style.zIndex = z; // restacking is a repaint
      n.card.classList.toggle('focused', FIELD.latch
        ? n.card === this._latch
        : (n === primary && primaryInfl > 0.45));
      // Remember the box as drawn, so next frame can tell whether the pointer
      // is on this card without touching layout.
      n.card._lw = n.dom ? n.w : CARD_W * n.scale;
      n.card._lh = n.dom ? n.h : CARD_H * n.scale;
      n.card._ldx = n.dx;
      n.card._ldy = n.dy + lift;
      touched.add(n.card);
    }
    for (const card of this._touched) if (!touched.has(card)) this._reset(card);
    this._touched = touched;

    // The card glow sits on whatever is revealed, falling back to the nearest
    // card when the pointer is between them.
    const glow = latchNode || primary;
    if (glow && (glow === latchNode || primaryInfl > 0.05)) {
      const cx = wl + glow.x + CARD_W / 2 + glow.dx;
      const cy = wt + glow.y + CARD_H / 2 + glow.dy - FIELD.lift * glow.infl;
      this.root.style.setProperty('--card-x', `${cx.toFixed(1)}px`);
      this.root.style.setProperty('--card-y', `${cy.toFixed(1)}px`);
      this.root.style.setProperty('--card-a', Math.max(glow.infl, glow.morph).toFixed(3));
    } else {
      this.root.style.setProperty('--card-a', '0');
    }

    // Keep filtering until the smoothed influences have caught up, even if no
    // pointer/map event fires in the meantime.
    if (easing) this.apply();
  }

  // Smoothstep from FOCUS_MORPH_START..1 -> 0..1: no morph until the pointer
  // is fairly centred, easing in to a full reveal at the centre.
  _morph(infl) {
    const t = Math.max(0, Math.min(1, (infl - FIELD.morphStart) / (1 - FIELD.morphStart)));
    return t * t * (3 - 2 * t);
  }

  _separate(a, b, axis) {
    if (!a || !b) return;
    // The pair's clearance is the base gap plus whatever extra the more
    // demanding of the two asks for (proximity + reveal).
    const gap = FIELD.minGap + Math.max(a.gapBias, b.gapBias);
    const ox = (b.x + b.dx) - (a.x + a.dx);
    const oy = (b.y + b.dy) - (a.y + a.dy);
    const overlapX = (a.w + b.w) / 2 + gap - Math.abs(ox);
    const overlapY = (a.h + b.h) / 2 + gap - Math.abs(oy);
    if (overlapX <= 0 || overlapY <= 0) return;

    let ax = axis;
    if (axis === 'min') {
      // Decide the push axis from the STATIC grid offsets (no displacement),
      // so it's fixed for the whole frame and can't flip between iterations
      // (which would oscillate) — the shallower one clears with least motion.
      const soX = (a.w + b.w) / 2 + gap - Math.abs(b.x - a.x);
      const soY = (a.h + b.h) / 2 + gap - Math.abs(b.y - a.y);
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
    card._mp = 0;
    card._lw = CARD_W; card._lh = CARD_H;
    card._ldx = 0; card._ldy = 0;
    card.style.width = `${CARD_W}px`;
    card.style.height = `${CARD_H}px`;
    card.style.transform = '';
    card.style.borderRadius = `${TILE_RADIUS}px`;
    card.style.zIndex = '';
    card.style.willChange = ''; // back to rest: drop the layer again
    card.classList.remove('focused');
  }

  clear() {
    for (const card of this._touched) this._reset(card);
    this._touched = new Set();
    this._latch = null;
    this.root.style.setProperty('--glow-a', '0');
    this.root.style.setProperty('--card-a', '0');
  }
}
