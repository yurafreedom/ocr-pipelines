// Below 768px the three segment cards become WAI-ARIA tabs (one card at a time).
// Tab roles and state exist only while that media query matches; without JS, or on wider
// screens, the cards are plain articles and all three render.
const QUERY = '(width < 768px)';

export function init() {
  const root = document.querySelector('[data-js="segments"]');
  if (!root) return;

  const tablist = root.querySelector('[data-js="segment-tablist"]');
  const tabs = [...tablist.querySelectorAll('[data-js="segment-tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));
  const titles = panels.map((panel) => panel.getAttribute('aria-labelledby'));
  const media = window.matchMedia(QUERY);
  let selected = 0;

  function select(index, focus) {
    selected = index;
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].classList.toggle('is-inactive', !active);
    });
    if (focus) tabs[index].focus();
  }

  function apply() {
    const tabbed = media.matches;
    root.classList.toggle('is-tabbed', tabbed);
    panels.forEach((panel, i) => {
      if (tabbed) {
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', tabs[i].id);
      } else {
        panel.removeAttribute('role');
        panel.setAttribute('aria-labelledby', titles[i]);
        panel.classList.remove('is-inactive');
      }
    });
    if (tabbed) select(selected, false);
  }

  tabs.forEach((tab, i) => tab.addEventListener('click', () => select(i, false)));

  tablist.addEventListener('keydown', (event) => {
    const last = tabs.length - 1;
    const next = {
      ArrowRight: selected === last ? 0 : selected + 1,
      ArrowLeft: selected === 0 ? last : selected - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next, true);
  });

  media.addEventListener('change', apply);
  apply();
}
