// Category tabs: dims every card whose tag doesn't match the active filter.
export function initTabs({ tabsEl, cards, onFilterChange }) {
  tabsEl.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      tabsEl.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.f;
      cards.forEach((card) => {
        card.classList.toggle('dim', filter !== 'all' && card.dataset.tag !== filter);
      });

      if (onFilterChange) onFilterChange();
    });
  });
}
