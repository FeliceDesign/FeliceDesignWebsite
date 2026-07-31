// The "flip" detail view: a clicked card's flyer grows from its on-screen
// position into a large preview, with the title/description fading in
// next to it. Closing reverses the animation back onto the original card.
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

    overlay.addEventListener('click', () => this.close());
    closeBtn.addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });
  }

  _targetRect() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (vw < 760) {
      const w = vw * 0.88;
      const h = w * 0.667;
      return { left: (vw - w) / 2, top: vh * 0.14, width: w, height: h };
    }
    const w = Math.min(vw * 0.46, 680);
    const h = w * 0.667;
    return { left: vw * 0.09, top: (vh - h) / 2, width: w, height: h };
  }

  _setFlyerMedia(work) {
    this.flyer.innerHTML = '';
    if (work.media.type === 'video') {
      this.flyer.style.backgroundImage = 'none';
      const video = document.createElement('video');
      video.autoplay = true; video.loop = true; video.muted = true; video.playsInline = true;
      video.src = work.media.src;
      this.flyer.appendChild(video);
    } else {
      this.flyer.style.backgroundImage = `url('${work.media.src}')`;
      this.flyer.style.backgroundSize = 'cover';
      this.flyer.style.backgroundPosition = 'center';
    }
  }

  open(card, work) {
    this.activeCard = card;
    const r = card.getBoundingClientRect(); // real on-screen position, even on a dragged map

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

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const t = this._targetRect();
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
    const r = this.activeCard.getBoundingClientRect();

    this.detailText.classList.remove('show');
    this.detailText.style.transform = '';
    this.closeBtn.classList.remove('show');
    this.overlay.classList.remove('open');

    this.flyer.style.left = `${r.left}px`;
    this.flyer.style.top = `${r.top}px`;
    this.flyer.style.width = `${r.width}px`;
    this.flyer.style.height = `${r.height}px`;
    this.flyer.style.boxShadow = '0 0 0 rgba(0,0,0,0)';

    const card = this.activeCard;
    const finish = () => {
      this.flyer.style.display = 'none';
      card.style.visibility = 'visible';
      if (this.activeCard === card) this.activeCard = null;
      this.flyer.removeEventListener('transitionend', finish);
    };
    this.flyer.addEventListener('transitionend', finish);
  }
}
