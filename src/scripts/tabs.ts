// Category tabs: each one rebuilds the map with only its own works, in their own
// dedicated grid, rather than just dimming the others.
//
// The tabs are real <a href="/?f=..."> links (so the shared navbar works on
// every page — see Nav.astro). On the map page we intercept their clicks and
// filter in place instead of navigating. Only elements with a data-f are filter
// tabs; the Kontakt link has none and is left to navigate normally.
export function initTabs({ tabsEl, worksByFilter, onFilterChange }) {
  const filterTabs = tabsEl.querySelectorAll('.tab[data-f]');
  filterTabs.forEach((tab) => {
    tab.addEventListener('click', (e) => {
      e.preventDefault(); // stay on the map; filter in place
      filterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      onFilterChange(worksByFilter[tab.dataset.f]);
    });
  });
}
