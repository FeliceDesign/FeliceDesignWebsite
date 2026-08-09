// The "flip" detail view: a clicked card's flyer grows from its on-screen
// position (already expanded from the hover) into a large preview shown at
// the image's full aspect ratio, with the title/description fading in next
// to it. Closing reverses the animation back onto the original card.
import { BASE_AR, CARD_W, CARD_H } from './constants';
import { aspectOf } from './aspect';

export class DetailView {
  constructor({ overlay, flyer, detailText, closeBtn, eyebrowEl, titleEl, descEl }) {
    this.overlay = overlay;
    this.flyer = flyer;
    this.detailText = detailText;
    this.closeBtn = closeBtn;
    this.eyebrowEl = eyebrowEl;
    this.titleEl = titleEl;
    this.descEl = descEl;
    this.activeCard = null;
    this.onOpen = null;  // called once the start rect is captured (clears the field)
    this.onClose = null; // called when closing (resets the field)

    overlay.addEventListener('click', () => this.close());
    closeBtn.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
  }

  // A box at the work's own aspect ratio, as large as fits within a generous
  // slice of the viewport, so the detail is shown fully uncropped.
  _targetRect(aspect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (vw < 760) {
      const maxW = vw * 0.9;
      const maxH = vh * 0.62;
      let w = maxW; let h = w / aspect;
      if (h > maxH) { h = maxH; w = h * aspect; }
      return { left: (vw - w) / 2, top: vh * 0.1, width: w, height: h };
    }

    const maxW = Math.min(vw * 0.5, 760);
    const maxH = vh * 0.82;
    let w = maxW; let h = w / aspect;
    if (h > maxH) { h = maxH; w = h * aspect; }
    return { left: vw * 0.08, top: (vh - h) / 2, width: w, height: h };
  }

  _setFlyerMedia(work) {
    this.flyer.innerHTML = '';
    if (work.media.type === 'video') {
      this.flyer.style.backgroundImage = 'none';
      const video = document.createElement('video');
      video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;
      // The poster shows instantly while the (already compressed) video loads.
      if (work.media.poster) video.poster = work.media.poster;
      video.src = work.media.playUrl;
      this.flyer.appendChild(video);
    } else {
      this.flyer.style.backgroundImage = `url('${work.media.src}')`;
      this.flyer.style.backgroundSize = 'cover';
      this.flyer.style.backgroundPosition = 'center';
    }
  }

  open(card, work) {
    this.activeCard = card;
    // Start from the card's live rect — it's already expanded to the image's
    // aspect ratio from the hover, so the grow into the detail is seamless.
    const r = card.getBoundingClientRect();

    this._setFlyerMedia(work);
    this.flyer.style.left = `${r.left}px`;
    this.flyer.style.top = `${r.top}px`;
    this.flyer.style.width = `${r.width}px`;
    this.flyer.style.height = `${r.height}px`;
    this.flyer.style.display = 'block';

    this.eyebrowEl.textContent = work.type;
    this.titleEl.textContent = work.title;
    this.descEl.textContent = work.desc;

    card.style.visibility = 'hidden';
    this.overlay.classList.add('open');
    if (this.onOpen) this.onOpen(); // reset the field now the start rect is captured

    const aspect = aspectOf(work) || r.width / r.height || BASE_AR;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const t = this._targetRect(aspect);
      this.flyer.style.left = `${t.left}px`;
      this.flyer.style.top = `${t.top}px`;
      this.flyer.style.width = `${t.width}px`;
      this.flyer.style.height = `${t.height}px`;
      this.flyer.style.boxShadow = '0 40px 100px rgba(0,0,0,0.7)';

      if (window.innerWidth < 760) {
        this.detailText.style.left = `${window.innerWidth * 0.06}px`;
        this.detailText.style.top = `${t.top + t.height + 28}px`;
        this.detailText.style.width = `${window.innerWidth * 0.88}px`;
        this.detailText.style.transform = '';
      } else {
        this.detailText.style.left = `${t.left + t.width + 56}px`;
        this.detailText.style.top = '50%';
        this.detailText.style.transform = 'translateY(-50%)';
        this.detailText.style.width = 'min(30vw, 340px)';
      }
      this.detailText.classList.add('show');
      this.closeBtn.classList.add('show');
    }));
  }

  close() {
    if (!this.activeCard) return;
    const card = this.activeCard;

    // Collapse the (hidden) card back to its grid size instantly, so the
    // flyer flies home to where the card will actually reappear rather than
    // to its expanded footprint.
    card.style.transition = 'none';
    card.style.width = `${CARD_W}px`;
    card.style.height = `${CARD_H}px`;
    card.style.transform = '';
    card.style.zIndex = '';
    card.classList.remove('focused');
    const r = card.getBoundingClientRect();
    requestAnimationFrame(() => { card.style.transition = ''; });

    if (this.onClose) this.onClose(); // reset the rest of the field

    this.detailText.classList.remove('show');
    this.detailText.style.transform = '';
    this.closeBtn.classList.remove('show');
    this.overlay.classList.remove('open');

    this.flyer.style.left = `${r.left}px`;
    this.flyer.style.top = `${r.top}px`;
    this.flyer.style.width = `${r.width}px`;
    this.flyer.style.height = `${r.height}px`;
    this.flyer.style.boxShadow = '0 0 0 rgba(0,0,0,0)';

    const finish = () => {
      this.flyer.style.display = 'none';
      card.style.visibility = 'visible';
      if (this.activeCard === card) this.activeCard = null;
      this.flyer.removeEventListener('transitionend', finish);
    };
    this.flyer.addEventListener('transitionend', finish);
  }
}
