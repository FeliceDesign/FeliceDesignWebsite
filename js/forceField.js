// Hover force field: while the map is standing still, cards scale up and
// push their neighbours aside based on distance to the cursor (or, on
// touch, distance to the fixed screen center). Disabled while dragging so
// panning and zooming never fight each other.
import { FIELD_RADIUS, FIELD_MAX_GROW, FIELD_LIFT, FIELD_PUSH, isTouch } from './constants.js';

export class ForceField {
  constructor({ cards, isDragging }) {
    this.cards = cards;
    this.isDragging = isDragging; // () => boolean, provided by the map
    this.root = document.documentElement;
    this.mX = -9999; this.mY = -9999;
    this._raf = false;

    window.addEventListener('mousemove', (e) => {
      this.mX = e.clientX; this.mY = e.clientY;
      if (!this._raf) { this._raf = true; requestAnimationFrame(() => this.apply()); }
    });
    // Recompute once after releasing the mouse so whatever's under the
    // cursor reacts immediately.
    window.addEventListener('mouseup', () => requestAnimationFrame(() => this.apply()));

    if (isTouch) requestAnimationFrame(() => this.apply()); // center card glows immediately
  }

  _centerXY() {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  apply() {
    this._raf = false;

    // Touch has no cursor: the field is centered on screen and stays active
    // during drags too, since cards slide through the center. Desktop only
    // runs the field when not dragging, and follows the real cursor.
    if (isTouch) {
      const c = this._centerXY();
      this.mX = c.x; this.mY = c.y;
    } else if (this.isDragging()) {
      this.clear();
      return;
    }

    this.root.style.setProperty('--glow-x', `${this.mX}px`);
    this.root.style.setProperty('--glow-y', `${this.mY}px`);

    let hoveredCx = this.mX;
    let hoveredCy = this.mY;
    let hoveredStrength = 0;
    let focusCard = null;
    let focusStrength = 0; // strongest card -> .focused (reveals title on touch)

    for (const card of this.cards) {
      if (card.classList.contains('dim') || card.style.visibility === 'hidden') {
        card.style.transform = '';
        card.classList.remove('focused');
        continue;
      }
      const r = card.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = this.mX - cx;
      const dy = this.mY - cy;
      const dist = Math.hypot(dx, dy);
      const t = Math.max(0, 1 - dist / FIELD_RADIUS);
      const influence = t * t;

      if (influence < 0.01) {
        card.style.transform = '';
        card.style.zIndex = '';
        card.classList.remove('focused');
        continue;
      }

      if (influence > focusStrength) { focusStrength = influence; focusCard = card; }

      // Is the pointer inside this card? Then don't push it away - it grows
      // in place. On touch, the card closest to the center counts as inside.
      const inside = isTouch
        ? card === focusCard
        : (this.mX >= r.left && this.mX <= r.right && this.mY >= r.top && this.mY <= r.bottom);

      if (inside && influence >= hoveredStrength) {
        hoveredStrength = influence; hoveredCx = cx; hoveredCy = cy;
      }

      // Push cards away from the cursor: unit vector pointing away, scaled
      // by the push amount. `dist + 0.001` avoids a divide-by-zero right at
      // the cursor.
      let ox = 0; let oy = 0;
      if (!inside) {
        const ux = -dx / (dist + 0.001);
        const uy = -dy / (dist + 0.001);
        const pushAmt = FIELD_PUSH * t; // falls off more gently than scale
        ox = ux * pushAmt; oy = uy * pushAmt;
      }

      const scale = 1 + FIELD_MAX_GROW * influence;
      card.style.transform = `translate(${ox.toFixed(1)}px, ${(oy - FIELD_LIFT * influence).toFixed(1)}px) scale(${scale.toFixed(3)})`;
      card.style.zIndex = String(5 + Math.round(influence * 30));
    }

    for (const card of this.cards) card.classList.toggle('focused', card === focusCard);

    if (isTouch && focusCard) {
      const r = focusCard.getBoundingClientRect();
      hoveredCx = r.left + r.width / 2; hoveredCy = r.top + r.height / 2;
      hoveredStrength = focusStrength;
    }

    // Cursor glow is always faintly on; card glow only lights up when a
    // card is actually being hovered/focused.
    this.root.style.setProperty('--glow-a', (0.5).toFixed(2));
    this.root.style.setProperty('--card-x', `${hoveredCx}px`);
    this.root.style.setProperty('--card-y', `${hoveredCy}px`);
    this.root.style.setProperty('--card-a', hoveredStrength.toFixed(3));
  }

  clear() {
    for (const card of this.cards) { card.style.transform = ''; card.style.zIndex = ''; }
    this.root.style.setProperty('--glow-a', '0');
    this.root.style.setProperty('--card-a', '0');
  }
}
