// Category tabs: each one rebuilds the map with only its own works, in
// their own dedicated grid, rather than just dimming the others.
export function initTabs({ tabsEl, worksByFilter, onFilterChange }) {
  tabsEl.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      tabsEl.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      onFilterChange(worksByFilter[btn.dataset.f]);
    });
  });
}
