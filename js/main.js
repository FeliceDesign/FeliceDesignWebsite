// Entry point: wires the map, hover force field, category tabs and detail
// view together. Each piece lives in its own module and only talks to the
// others through the small set of callbacks assigned here.
import { isTouch } from './constants.js';
import { WORKS } from './works.js';
import { InfiniteMap } from './infiniteMap.js';
import { ForceField } from './forceField.js';
import { initTabs } from './tabs.js';
import { DetailView } from './detailView.js';

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
const field = new ForceField({ cards: map.cards, isDragging: () => map.isDragging() });

map.onDragStart = () => field.clear(); // desktop: drop the zoom the instant a drag starts
map.onDragMove = () => field.apply(); // touch: field follows cards sliding past the center
map.onFrame = () => field.apply(); // touch: keep the field alive during inertia glide
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
map.onCardOpen = (card, work) => detail.open(card, work);

initTabs({
  tabsEl: document.getElementById('tabs'),
  worksByFilter,
  onFilterChange: (works) => {
    field.clear();
    map.setWorks(works);
  },
});
