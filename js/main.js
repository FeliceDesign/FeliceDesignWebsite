// Entry point: wires the map, hover force field, category tabs and detail
// view together. Each piece lives in its own module and only talks to the
// others through the small set of callbacks assigned here.
//
// All tuning numbers come from the active preset in js/presets.js — switch
// it there, via ?preset=…, or with __preset('baseline') in the console.
import { applyPresetStyles, installPresetSwitcher } from './presets.js';
import { isTouch } from './constants.js';
import { WORKS } from './works.js';
import { measureAspects } from './aspect.js';
import { InfiniteMap } from './infiniteMap.js';
import { ForceField } from './forceField.js';
import { initTabs } from './tabs.js';
import { DetailView } from './detailView.js';

// Push the active preset's styling values onto :root before anything paints.
applyPresetStyles();
installPresetSwitcher();

// Learn each work's true aspect ratio so cards can expand to their full,
// uncropped shape on hover and in the detail view.
measureAspects(WORKS);

const world = document.getElementById('world');
const viewport = document.getElementById('viewport');
const parallaxEls = [document.getElementById('waves'), document.getElementById('waves-glow')];

// Each tab shows its own set of works in its own grid (see js/tabs.js).
const worksByFilter = {
  all: WORKS,
  foto: WORKS.filter((w) => w.tag === 'foto'),
  d3: WORKS.filter((w) => w.tag === 'd3'),
};

const hint = document.getElementById('hint');
if (isTouch) hint.textContent = 'Ziehen — die Mitte ist im Fokus';

const map = new InfiniteMap({ world, viewport, works: worksByFilter.all, parallaxEls });
const field = new ForceField({ cards: map.cards, map, isDragging: () => map.isDragging() });

// Desktop drops the field while panning; otherwise the field re-runs every
// frame — including while the map glides — so it stays live and continuous.
map.onDragStart = () => field.clear();
map.onDragMove = () => field.apply();
map.onFrame = () => field.apply();
map.onSettle = () => field.apply();
map.onHintDismiss = () => hint.classList.add('gone');

const detail = new DetailView({
  overlay: document.getElementById('overlay'),
  flyer: document.getElementById('flyer'),
  detailText: document.getElementById('detailText'),
  closeBtn: document.getElementById('closeBtn'),
  eyebrowEl: document.getElementById('dEyebrow'),
  titleEl: document.getElementById('dTitle'),
  descEl: document.getElementById('dDesc'),
});
detail.onOpen = () => field.clear();  // reset expanded/pushed cards behind the overlay
detail.onClose = () => field.clear();
map.onCardOpen = (card, work) => detail.open(card, work);

initTabs({
  tabsEl: document.getElementById('tabs'),
  worksByFilter,
  onFilterChange: (works) => {
    field.clear();
    map.setWorks(works);
  },
});
