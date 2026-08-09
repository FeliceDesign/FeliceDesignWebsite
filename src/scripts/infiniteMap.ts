// Builds the endless, draggable map of work cards.
//
// One "tile" is a COLS x ROWS grid holding one card per work (grid.ts picks
// COLS/ROWS to fit whatever set of works is currently shown). The tile is
// cloned REPEAT x REPEAT so cards always surround the visible viewport.
// Dragging moves #world via a CSS transform; when a tile drifts fully out of
// view, its world position is wrapped modulo the tile size, so the map feels
// infinite without ever growing the DOM.
//
// Video tiles: this is where the old build fell over. Every video work was a
// live `autoplay` <video>, cloned REPEAT×REPEAT (9×) → dozens of huge streams
// at once. Here each video tile instead shows a lightweight POSTER image, and a
// single IntersectionObserver plays ONLY the tiles actually inside the viewport
// and pauses the rest. Autoplay still reads as "these are videos" everywhere,
// but only a handful ever stream at a time.
import { CARD_W, CARD_H, GAP, CELL_W, CELL_H, TILE_RADIUS, REPEAT, PARALLAX, isTouch } from './constants';
import { TAGLABEL, type Work } from './types';
import { gridSize } from './grid';
import { layout } from './arrange';

function cardMarkup(work: Work): string {
  let media: string;
  if (work.media.type === 'video') {
    // Poster shown immediately on every clone; the <video> has no `autoplay`
    // and preload="none" so it costs nothing until the observer plays it.
    media = `
      <div class="card-img card-poster" style="background-image:url('${work.media.poster}')"></div>
      <video class="card-video" loop muted playsinline preload="none"
             poster="${work.media.poster}" data-src="${work.media.playUrl}"></video>`;
  } else {
    media = `<div class="card-img" style="background-image:url('${work.media.src}')"></div>`;
  }
  return `
    ${media}
    <div class="card-title">
      <span class="t">${work.title}</span>
      <span class="s ${work.tag}">${TAGLABEL[work.tag]}</span>
    </div>`;
}

export class InfiniteMap {
  world: HTMLElement;
  viewport: HTMLElement;
  parallaxEls: HTMLElement[];
  cards: any[];
  works!: Work[];
  onDragStart: (() => void) | null = null;
  onDragMove: (() => void) | null = null;
  onFrame: (() => void) | null = null;
  onSettle: (() => void) | null = null;
  onCardOpen: ((card: HTMLElement, work: Work) => void) | null = null;
  onHintDismiss: (() => void) | null = null;
  _moving = false;
  _videoObserver: IntersectionObserver | null = null;

  velX = 0; velY = 0;
  dragging = false; moved = false; travel = 0;
  lastX = 0; lastY = 0;
  accX = 0; accY = 0;
  cellW = 0; cellH = 0; tileW = 0; tileH = 0;
  posX = 0; posY = 0;

  constructor({ world, viewport, works, parallaxEls }:
    { world: HTMLElement; viewport: HTMLElement; works: Work[]; parallaxEls: HTMLElement[] }) {
    this.world = world;
    this.viewport = viewport;
    this.parallaxEls = parallaxEls;
    this.cards = []; // stable array, mutated in place so ForceField sees updates

    this._setupVideoObserver();
    this._bindPointerEvents();
    this.setWorks(works);
    this._runInertia();
  }

  isDragging() {
    return this.dragging && this.moved;
  }

  // One observer for all video tiles across every rebuild. A tile that enters
  // the viewport loads its src and plays; one that leaves pauses. This is the
  // whole fix for "the videos don't load": at most a screenful ever streams.
  _setupVideoObserver() {
    this._videoObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          if (!video.src && video.dataset.src) video.src = video.dataset.src;
          const p = video.play();
          if (p && typeof p.catch === 'function') p.catch(() => {}); // ignore autoplay races
        } else {
          video.pause();
        }
      }
    }, {
      root: this.viewport,
      // A generous margin so a tile is already playing by the time it slides in.
      rootMargin: '10% 10% 10% 10%',
      threshold: 0.15,
    });
  }

  setWorks(works: Work[]) {
    // Pick a full rectangle for this many works, pad it up with repeated images
    // so the last row is never half-empty (which would leave holes and break
    // the infinite wrap), then constrained-shuffle. `this.works` becomes the
    // laid-out, padded list so a card's dataset.idx maps straight to it.
    const { cols, rows, cells } = gridSize(works.length);
    // How many cells are fully visible in the opening viewport from the top-left
    // corner (the map starts there). Fillers are kept out of this block so the
    // first screen never shows a photo and its padded duplicate together. Capped
    // at cols-1/rows-1 so the block can never swallow the whole grid — if it did,
    // there'd be nowhere left to banish the filler to and the penalty would be a
    // no-op (which is exactly what let the duplicate through before).
    const openCols = Math.min(cols - 1, Math.floor(window.innerWidth / (CARD_W + GAP)));
    const openRows = Math.min(rows - 1, Math.floor(window.innerHeight / (CARD_H + GAP)));
    const placed = layout(works, cols, rows, cells, works.length * 131 + 7, openCols, openRows);
    this.works = placed;

    // TEMP debug (only with ?editor): report the grid shape and where every
    // repeated image landed vs. the opening block, to diagnose duplicates.
    if (new URLSearchParams(location.search).has('editor')) {
      const seen = new Map<string, number[]>();
      placed.forEach((w, i) => {
        const arr = seen.get(w.slug) || [];
        arr.push(i);
        seen.set(w.slug, arr);
      });
      const dupes = [...seen.entries()].filter(([, ix]) => ix.length > 1);
      console.log(`[map] ${cols}x${rows}=${cells}, opening block ${openCols}x${openRows}`);
      for (const [slug, ix] of dupes) {
        console.log(`[map] duplicate "${slug}" at cells`,
          ix.map((i) => `(${i % cols},${Math.floor(i / cols)})`).join(' '));
      }
    }

    this.cellW = CARD_W + GAP;
    this.cellH = CARD_H + GAP;
    this.tileW = cols * this.cellW;
    this.tileH = rows * this.cellH;

    if (this._videoObserver) this._videoObserver.disconnect();
    this.world.innerHTML = '';
    this.cards.length = 0;

    for (let ty = 0; ty < REPEAT; ty++) {
      for (let tx = 0; tx < REPEAT; tx++) {
        for (let i = 0; i < placed.length; i++) {
          const work = placed[i];
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
          card.style.borderRadius = `${TILE_RADIUS}px`;
          card.dataset.idx = String(i);
          card.dataset.tag = work.tag;
          (card as any)._work = work; // read by the force field for its aspect ratio
          (card as any)._ox = x; (card as any)._oy = y;
          (card as any)._col = Math.round(x / CELL_W);
          (card as any)._row = Math.round(y / CELL_H);
          card.innerHTML = cardMarkup(work);

          this.world.appendChild(card);
          this.cards.push(card);

          // Register any video tile with the play/pause observer.
          if (work.media.type === 'video' && this._videoObserver) {
            const v = card.querySelector('video');
            if (v) this._videoObserver.observe(v);
          }
        }
      }
    }

    this.posX = -this.tileW;
    this.posY = -this.tileH;
    this.velX = 0; this.velY = 0;
    this._applyTransform();
  }

  _applyTransform() {
    this.posX = ((this.posX % this.tileW) + this.tileW) % this.tileW - this.tileW;
    this.posY = ((this.posY % this.tileH) + this.tileH) % this.tileH - this.tileH;
    this.world.style.transform = `translate3d(${this.posX}px, ${this.posY}px, 0)`;

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
          this.velX *= 0.92; this.velY *= 0.92;
          if (Math.abs(this.velX) < 0.05) this.velX = 0;
          if (Math.abs(this.velY) < 0.05) this.velY = 0;
          this._applyTransform();
          this._moving = true;
          if (this.onFrame) this.onFrame();
        } else if (this._moving) {
          this._moving = false;
          if (this.onSettle) this.onSettle();
        }
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  _point(e: any) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  _bindPointerEvents() {
    const down = (e: any) => {
      this.dragging = true; this.moved = false; this.travel = 0;
      document.body.classList.add('dragging');
      const p = this._point(e);
      this.lastX = p.x; this.lastY = p.y;
      this.velX = this.velY = 0;
    };
    const move = (e: any) => {
      if (!this.dragging) return;
      const p = this._point(e);
      const dx = p.x - this.lastX;
      const dy = p.y - this.lastY;
      this.travel += Math.abs(dx) + Math.abs(dy);
      if (!this.moved && this.travel > 3) {
        this.moved = true;
        if (!isTouch && this.onDragStart) this.onDragStart();
      }
      this.posX += dx; this.posY += dy;
      this.accX += dx; this.accY += dy;
      this.velX = dx; this.velY = dy;
      this.lastX = p.x; this.lastY = p.y;
      this._applyTransform();
      if (this.onDragMove) this.onDragMove();
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

    this.world.addEventListener('click', (e) => {
      if (this.moved) return;
      const card = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
      if (card && this.onCardOpen) this.onCardOpen(card, this.works[+card.dataset.idx!]);
    });
  }
}
