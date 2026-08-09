// Reversible UI presets.
//
// Every tunable number for the card grid, the focus field and the styling of
// the glow / navbar / screen edges lives in one of the presets below.
// `baseline` is the look the site has on main; every other preset is a patch
// on top of it, so a preset only spells out what it actually changes and
// reverting is never guesswork.
//
// Switching presets:
//   permanently   -> change DEFAULT_PRESET below to 'baseline'
//   for one visit -> add ?preset=baseline to the URL
//   from the console -> __preset('baseline') (remembered across reloads,
//                       __preset(null) forgets it again, __preset() lists all)
//
// The CSS files repeat the baseline values as var() fallbacks, so the site
// still renders exactly like `baseline` even if this module never runs.

export const DEFAULT_PRESET = 'test01';

const BASELINE = {
  label: 'Baseline — the look on main',

  // Card grid geometry. Rest cards are square so a landscape and a portrait
  // image grow to a similar size when focused.
  layout: {
    // One global zoom for the whole grid: scales card size, gap and radius
    // together, so 1.2 = 20% bigger everything, 0.8 = smaller/denser. The
    // force field grows cards relative to card size, so it follows along
    // automatically. (Navbar has its own nav.scale.)
    gridScale: 1.3,
    card: 240, cardTouch: 150,
    gap: 96, gapTouch: 64,
    radius: 18, radiusTouch: 12, // rounded at rest, eased to sharp on reveal
    parallax: 0.18,
  },

  // The focus field: what happens to cards near the pointer.
  field: {
    radiusCells: 1.4, // influence reach, as a multiple of the grid pitch
    scale: 0.16,      // how much a card puffs up at full influence
    smooth: 0.3, smoothTouch: 0.16, // per-frame ease of the influence filter

    // The full-aspect reveal.
    morphStart: 0.6,  // influence a card needs before it starts morphing
    area: 2.0, areaTouch: 1.85, // focused box area, × the base card's
    grow: 1.1,        // floor so very wide/tall images still contain the card
    maxW: 2.05, maxH: 2.05, // × card size
    lift: 10, liftTouch: 8, // px the focused card floats up

    // Hold the reveal while the pointer is actually on the card, instead of
    // letting it ebb with the influence. Desktop only — touch has no pointer
    // to be "on" a card, so it keeps the influence-driven reveal.
    latch: false,
    latchSpeed: 0.18, // per-frame ease of the latched morph (higher = snappier)
    latchMargin: 0,   // px of slack before a revealed card lets the pointer go

    // Clearance kept between tiles. `min` always applies; `approach` fades in
    // with proximity (neighbours drift apart before anything is revealed) and
    // `focus` is the extra room demanded around the revealed card itself.
    minGap: 12, minGapTouch: 8,
    approachGap: 0, approachGapTouch: 0,
    focusGap: 0, focusGapTouch: 0,
  },

  // The two radial "brightness" masks over the wave layer: one under the
  // cursor, one on the focused card.
  glow: {
    layerOpacity: 0.4,
    cursorRadius: 95, cursorFade: 62, cursorStrength: 0.40,
    cardRadius: 150, cardFade: 66, cardStrength: 0.38,
  },

  // Logo + tabs. 1 = current size, 2 = double. Phones get their own value
  // because the header row can't grow without pushing the tabs off screen.
  nav: { scale: 1, scaleMobile: 1 },

  // Blur frame and vignette around the screen edges. Percentages are the
  // gradient stops: smaller = the effect starts closer to the center.
  edges: {
    blur: 10,
    blurMask: { sizeX: 70, sizeY: 80, clear: 65, mid: 75, midAlpha: 0.4, solid: 84 },
    vignette: {
      sizeX: 80, sizeY: 78,
      clear: 65, mid: 75, dark: 82,
      midAlpha: 0.35, darkAlpha: 0.82, edgeAlpha: 0.98,
    },
  },
};

// Current experiment: much wider cursor glow, a reveal that latches while the
// pointer is on the image, neighbours that clear out earlier and keep more
// room, a double-size navbar and heavier edge blur / vignette.
const TEST01 = {
  label: 'Test 01 — wide glow, latched reveal, bigger navbar, heavier edges',
  field: {
    radiusCells: 1.9,  // neighbours feel the pointer a whole cell earlier
    latch: true,
    latchSpeed: 0.16,
    latchMargin: 8,
    approachGap: 18, approachGapTouch: 10,
    focusGap: 56, focusGapTouch: 30,
  },
  glow: { cursorRadius: 570 },  // 95px + 500%
  nav: { scale: 2, scaleMobile: 1.35 },
  edges: {
    blur: 18,
    blurMask: { sizeX: 80, sizeY: 78, clear: 30, mid: 52, midAlpha: 0.55, solid: 74 },
    vignette: {
      sizeX: 82, sizeY: 80,
      clear: 26, mid: 50, dark: 74,
      midAlpha: 0.5, darkAlpha: 0.9, edgeAlpha: 1,
    },
  },
};

function merge(base, patch) {
  const out = {};
  for (const key of Object.keys(base)) {
    const b = base[key];
    const p = patch ? patch[key] : undefined;
    out[key] = (b && typeof b === 'object' && !Array.isArray(b)) ? merge(b, p) : (p !== undefined ? p : b);
  }
  return out;
}

export const PRESETS = {
  baseline: BASELINE,
  test01: merge(BASELINE, TEST01),
};

const STORAGE_KEY = 'felice.preset';

function stored() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function resolveName() {
  const fromUrl = new URLSearchParams(window.location.search).get('preset');
  const name = fromUrl || stored() || DEFAULT_PRESET;
  return PRESETS[name] ? name : DEFAULT_PRESET;
}

export const PRESET_NAME = resolveName();
export const PRESET = PRESETS[PRESET_NAME];

// Pushes every styling value of the active preset onto :root, where the
// stylesheets pick it up. Everything CSS-side has a baseline fallback, so a
// missing variable just means "baseline".
export function applyPresetStyles(preset = PRESET, name = PRESET_NAME) {
  const root = document.documentElement;
  const set = (k, v) => root.style.setProperty(k, v);
  const { glow, nav, edges } = preset;
  const bm = edges.blurMask;
  const vg = edges.vignette;

  root.dataset.preset = name;

  set('--glow-layer-o', String(glow.layerOpacity));
  set('--glow-r', `${glow.cursorRadius}px`);
  set('--glow-fade', `${glow.cursorFade}%`);
  set('--glow-strength', String(glow.cursorStrength));
  set('--card-r', `${glow.cardRadius}px`);
  set('--card-fade', `${glow.cardFade}%`);
  set('--card-strength', String(glow.cardStrength));

  set('--nav-scale-desktop', String(nav.scale));
  set('--nav-scale-mobile', String(nav.scaleMobile));

  set('--edge-blur', `${edges.blur}px`);
  set('--bm-x', `${bm.sizeX}%`);
  set('--bm-y', `${bm.sizeY}%`);
  set('--bm-clear', `${bm.clear}%`);
  set('--bm-mid', `${bm.mid}%`);
  set('--bm-a', String(bm.midAlpha));
  set('--bm-solid', `${bm.solid}%`);

  set('--vig-x', `${vg.sizeX}%`);
  set('--vig-y', `${vg.sizeY}%`);
  set('--vig-clear', `${vg.clear}%`);
  set('--vig-mid', `${vg.mid}%`);
  set('--vig-dark', `${vg.dark}%`);
  set('--vig-a-mid', String(vg.midAlpha));
  set('--vig-a-dark', String(vg.darkAlpha));
  set('--vig-a-edge', String(vg.edgeAlpha));
}

// Console helper: __preset('baseline') switches and reloads, __preset(null)
// goes back to the default, __preset() just lists what's available.
export function installPresetSwitcher() {
  window.__preset = (name) => {
    if (name === undefined) {
      return { active: PRESET_NAME, available: Object.keys(PRESETS) };
    }
    try {
      if (name === null) localStorage.removeItem(STORAGE_KEY);
      else if (PRESETS[name]) localStorage.setItem(STORAGE_KEY, name);
      else return `unknown preset "${name}" — try ${Object.keys(PRESETS).join(', ')}`;
    } catch { /* private mode: fall back to the URL switch */ }
    window.location.reload();
    return undefined;
  };
}
