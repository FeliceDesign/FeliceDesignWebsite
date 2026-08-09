// Entry point: wires the map, hover force field, category tabs and detail view
// together. Each piece lives in its own module and only talks to the others
// through the small set of callbacks assigned here.
//
// The works come from `window.__WORKS__`, which index.astro serializes from the
// content collection at build time (already-resolved image/video URLs, the
// constrained-shuffle order baked in). All styling tuning comes from the active
// preset in presets.ts.
import { applyPresetStyles, installPresetSwitcher } from './presets';
import { isTouch } from './constants';
import type { Work } from './types';
import { measureAspects } from './aspect';
import { InfiniteMap } from './infiniteMap';
import { ForceField } from './forceField';
import { initTabs } from './tabs';
import { DetailView } from './detailView';

const WORKS: Work[] = (window as any).__WORKS__ || [];

applyPresetStyles();
installPresetSwitcher();

// Fill in any aspect ratios not already known from the content schema.
measureAspects(WORKS);

const world = document.getElementById('world')!;
const viewport = document.getElementById('viewport')!;
const parallaxEls = [document.getElementById('waves')!, document.getElementById('waves-glow')!];

const worksByFilter: Record<string, Work[]> = {
  all: WORKS,
  foto: WORKS.filter((w) => w.tag === 'foto'),
  d3: WORKS.filter((w) => w.tag === 'd3'),
};

const hint = document.getElementById('hint')!;
if (isTouch) hint.textContent = 'Ziehen — die Mitte ist im Fokus';

const map = new InfiniteMap({ world, viewport, works: worksByFilter.all, parallaxEls });
const field = new ForceField({ cards: map.cards, map, isDragging: () => map.isDragging() });

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
detail.onOpen = () => field.clear();
detail.onClose = () => field.clear();
map.onCardOpen = (card, work) => detail.open(card, work);

const tabsEl = document.getElementById('tabs')!;
initTabs({
  tabsEl,
  worksByFilter,
  onFilterChange: (works: Work[]) => {
    field.clear();
    map.setWorks(works);
  },
});

// Landing with ?f=<filter> (e.g. a category tab clicked from the kontakt page)
// opens straight into that filter and marks its tab active. `all` is the default,
// so it needs no work.
const initialFilter = new URLSearchParams(location.search).get('f');
if (initialFilter && initialFilter !== 'all' && worksByFilter[initialFilter]) {
  tabsEl.querySelectorAll('.tab[data-f]').forEach((t) =>
    t.classList.toggle('active', (t as HTMLElement).dataset.f === initialFilter));
  field.clear();
  map.setWorks(worksByFilter[initialFilter]);
}

// The temporary slider editor loads only when ?editor is in the URL, so it's
// never in the public bundle path for normal visitors.
if (new URLSearchParams(location.search).has('editor')) {
  import('./editor').then((m) => m.initEditor({
    // Geometry edits change DOM slot positions, so the editor calls this to
    // rebuild the grid from the freshly recomputed constants. Field/glow/edge
    // edits don't need it — the force field and CSS read those live.
    relayout: () => { map.setWorks(map.works); field.clear(); },
  }));
}
