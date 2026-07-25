// The real, full section list used across GCR — same split CategoryPage.jsx's
// nav uses, via categoryMap.js's subtypeToCategory(). "Activities" used to be
// one catch-all tab covering marinas/wellness/public-spots/services/
// everything-else at once; this is the actual breakdown. Happy Hours isn't a
// subtype at all (any restaurant or bar can have one) so it's matched on the
// `happy_hour` field instead of `section` — see matchesCategory() below.
// Events isn't a standalone swipeable/searchable entity, so its tab links out
// to the full Events page instead of filtering in place.
export const CAT_TABS = [
  { id: 'all',           label: 'All',          emoji: '🌟' },
  { id: 'restaurants',   label: 'Restaurants',  emoji: '🍽️' },
  { id: 'coffee',        label: 'Coffee',       emoji: '☕' },
  { id: 'nightlife',     label: 'Nightlife',    emoji: '🎵' },
  { id: 'things-to-do',  label: 'Things To Do', emoji: '🏄' },
  { id: 'shopping',      label: 'Shopping',     emoji: '🛍️' },
  { id: 'public-spots',  label: 'Public Spots', emoji: '✨' },
  { id: 'wellness',      label: 'Wellness',     emoji: '💆' },
  { id: 'marinas',       label: 'Marinas',      emoji: '⚓' },
  { id: 'staying',       label: 'Stay',         emoji: '🏨' },
  { id: 'happy-hours',   label: 'Happy Hours',  emoji: '🍹' },
  { id: 'services',      label: 'Services',     emoji: '🧰' },
  { id: 'events',        label: 'Events',       emoji: '🎪', to: '/events' },
]

// Shared by every "which cards match this tab" filter -- Happy Hours isn't a
// section (any restaurant/bar can have one), so it checks the happy_hour
// field directly instead of `section`.
export function matchesCategory(b, category) {
  if (category === 'happy-hours') return !!b.happy_hour
  return b.section === category
}
