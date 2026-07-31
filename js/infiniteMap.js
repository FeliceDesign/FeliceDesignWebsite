// Builds the endless, draggable map of work cards.
//
// One "tile" is a COLS x ROWS grid holding one card per work (grid.js picks
// COLS/ROWS to fit whatever set of works is currently shown). The tile is
// cloned REPEAT x REPEAT so cards always surround the visible viewport.
// Dragging moves #world via a CSS transform; when a tile drifts fully out
// of view, its world position is wrapped modulo the tile size, so the map
// feels infinite without ever growing the DOM.
import { CARD_W, CARD_H, GAP, REPEAT, PARALLAX, SETTLE_SPEED, isTouch } from './constants.js';
import { TAGLABEL } from './works.js';
import { gridSize } from './grid.js';

function cardMarkup(work) {
  const media = work.media.type === 'video'
    ? `<video class="card-video" autoplay loop muted playsinline src="${work.media.src}"></video>`
    : `<div class="card-img" style="background-image:url('${work.media.src}')"></div>`;
  return `
    ${media}
    <div class="card-title">
      <span class="t">${work.title}</span>
      <span class="s ${work.tag}">${TAGLABEL[work.tag]}</span>
    </div>`;
}

export class InfiniteMap {
  constructor({ world, viewport, works, parallaxEls }) {
    this.world = world;
    this.viewport = viewport;
    this.parallaxEls = parallaxEls;
    this.cards = []; // kept as a stable array (mutated in place) so other
    // modules that hold a reference to it (e.g. ForceField) see updates.

    // Called by main.js to react to drag/inertia (used for the touch force
    // field, which has to follow cards through the fixed screen center).
    this.onDragStart = null;
    this.onDragMove = null;
    this.onFrame = null;
    this.onSettle = null;
    this.onCardOpen = null;
    this.onHintDismiss = null;
    this._moving = false;

    this.velX = 0; this.velY = 0;
    this.dragging = false; this.moved = false;
    this.lastX = 0; this.lastY = 0;
    // Raw accumulator WITHOUT wrapping, for continuous parallax
    // (posX/posY jump periodically, this doesn't).
    this.accX = 0; this.accY = 0;

    this._bindPointerEvents();
    this.setWorks(works);
    this._runInertia();
  }

  isDragging() {
    return this.dragging;
  }

  // True while the map is being dragged or gliding faster than a slow creep.
  // The focus field treats anything slower as "settled" so the expansion
  // kicks in promptly instead of waiting out the long inertia tail.
  isMoving() {
    return this.dragging || Math.hypot(this.velX, this.velY) > SETTLE_SPEED;
  }

  // Rebuilds the map for a new set of works (e.g. switching category tabs),
  // with its own grid shape sized to fit exactly that many works.
  setWorks(works) {
    this.works = works;

    const { cols, rows } = gridSize(works.length);
    this.cellW = CARD_W + GAP;
    this.cellH = CARD_H + GAP;
    this.tileW = cols * this.cellW;
    this.tileH = rows * this.cellH;

    this.world.innerHTML = '';
    this.cards.length = 0;

    for (let ty = 0; ty < REPEAT; ty++) {
      for (let tx = 0; tx < REPEAT; tx++) {
        for (let i = 0; i < works.length; i++) {
          const work = works[i];
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = tx * this.tileW + col * this.cellW;
          const y = ty * this.tileH + row * this.cellH;

          const card = document.createElement('div');
          card.className = 'card';
          card.style.width = `${CARD_W}px`;
          card.style.height = `${CARD_H}px`;
          card.style.left = `${x}px`;
          card.style.top = `${y}px`;
          card.dataset.idx = i;
          card.dataset.tag = work.tag;
          card._work = work; // read by the force field for its aspect ratio
          card.innerHTML = cardMarkup(work);

          this.world.appendChild(card);
          this.cards.push(card);
        }
      }
    }

    // Re-center on the new grid and drop any momentum from before the switch.
    this.posX = -this.tileW;
    this.posY = -this.tileH;
    this.velX = 0; this.velY = 0;
    this._applyTransform();
  }

  _applyTransform() {
    // Wrap via modulo: no matter how much momentum builds up, the position
    // always stays within one tile's range, so it can never outrun the
    // REPEAT x REPEAT buffer and show empty space.
    this.posX = ((this.posX % this.tileW) + this.tileW) % this.tileW - this.tileW;
    this.posY = ((this.posY % this.tileH) + this.tileH) % this.tileH - this.tileH;
    this.world.style.transform = `translate3d(${this.posX}px, ${this.posY}px, 0)`;

    // Parallax: shift the background pattern by a fraction of the drag,
    // reusing its own tiling so there are never visible seams. Uses the
    // unwrapped accumulator so the background never jumps.
    const bx = (this.accX * PARALLAX).toFixed(1);
    const by = (this.accY * PARALLAX).toFixed(1);
    for (const el of this.parallaxEls) {
      el.style.backgroundPosition = `${bx}px ${by}px`;
    }
  }

  _runInertia() {
    const tick = () => {
      if (!this.dragging) {
        if (this.velX || this.velY) {
          this.posX += this.velX; this.posY += this.velY;
          this.accX += this.velX; this.accY += this.velY;
          this.velX *= 0.92; this.velY *= 0.92; // friction -> smooth glide-out
          if (Math.abs(this.velX) < 0.05) this.velX = 0;
          if (Math.abs(this.velY) < 0.05) this.velY = 0;
          this._applyTransform();
          this._moving = true;
          if (this.onFrame) this.onFrame();
        } else if (this._moving) {
          // Just came to rest: let the focus field settle on the centre card.
          this._moving = false;
          if (this.onSettle) this.onSettle();
        }
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  _point(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  _bindPointerEvents() {
    const down = (e) => {
      this.dragging = true; this.moved = false;
      document.body.classList.add('dragging');
      if (!isTouch && this.onDragStart) this.onDragStart(); // desktop: drop the zoom while dragging
      const p = this._point(e);
      this.lastX = p.x; this.lastY = p.y;
      this.velX = this.velY = 0;
    };
    const move = (e) => {
      if (!this.dragging) return;
      const p = this._point(e);
      const dx = p.x - this.lastX;
      const dy = p.y - this.lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) this.moved = true;
      this.posX += dx; this.posY += dy;
      this.accX += dx; this.accY += dy;
      this.velX = dx; this.velY = dy; // last movement = starting momentum
      this.lastX = p.x; this.lastY = p.y;
      this._applyTransform();
      if (this.onDragMove) this.onDragMove(); // let the field react to the drag
      if (this.onHintDismiss) this.onHintDismiss();
    };
    const up = () => {
      this.dragging = false;
      document.body.classList.remove('dragging');
    };

    this.viewport.addEventListener('mousedown', down);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    this.viewport.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);

    // A click only opens a card if the map wasn't dragged in between.
    this.world.addEventListener('click', (e) => {
      if (this.moved) return;
      const card = e.target.closest('.card');
      if (card && this.onCardOpen) this.onCardOpen(card, this.works[+card.dataset.idx]);
    });
  }
}
