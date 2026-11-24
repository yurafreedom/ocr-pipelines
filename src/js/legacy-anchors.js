// Links to the old site use its anchors; map them to the sections that replaced them.
const LEGACY_ANCHORS = {
  '#audit': '#book',
  '#systems': '#pricing',
  '#calculator': '#pricing',
  '#proof': '#tables',
};

export function init() {
  const target = LEGACY_ANCHORS[window.location.hash];
  if (!target) return;
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}${target}`);
  document.querySelector(target)?.scrollIntoView({ behavior: 'instant' });
}
