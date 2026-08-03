import { computeStatus } from './hours'
import { formatSubtypeLabel } from '../categoryMap'

// ─── Section grouping ─────────────────────────────────────────────────────────
//
// Turns a flat list of entities into the labelled rows the Browse view renders.
//
// The titles are framed by intent rather than by taxonomy — "Open right now",
// "On the water", "Near you" — because that's what someone standing on a street
// in Orange Beach is actually asking. Subtype rows ("Seafood", "Pizza") come
// after, as a fallback for whatever the intent rows didn't pick up.
//
// This all runs client-side today because the listing pages already fetch every
// entity up front. When the API grows a /api/gcr/sections endpoint, the section
// DEFINITIONS below are the contract to port over — grouping server-side is what
// lets rail *order* become an editorial decision instead of a side effect of
// which subtype happens to be most common.

const MAX_PER_RAIL = 12
// A rail with two cards in it looks broken — worse than not having the rail.
// Anything under this folds back into the catch-all row.
const MIN_PER_RAIL = 4
// How many rails one place may appear in. A waterfront seafood spot that does
// brunch legitimately belongs in three rows, but past two it starts to feel like
// the page only knows about six businesses.
const MAX_APPEARANCES = 2
const MAX_SUBTYPE_RAILS = 6

const tagNames = (e) =>
  (Array.isArray(e.tags) ? e.tags : []).map(t =>
    (typeof t === 'string' ? t : (t.tag_name || t.tag || ''))
      .toLowerCase().trim().replace(/[\s\-\/]+/g, '_')
  ).filter(Boolean)

const hasTag = (e, ...needles) => {
  const tags = tagNames(e)
  return tags.some(t => needles.some(n => t.includes(n)))
}

const FOOD_CATEGORIES = new Set(['restaurants', 'coffee', 'coffee-sweets', 'nightlife', 'happy-hours'])

const byRating = (a, b) => (b.rating || 0) - (a.rating || 0)
const byDistance = (a, b) => (a.distance_miles ?? 9999) - (b.distance_miles ?? 9999)

// ─── Definitions ──────────────────────────────────────────────────────────────
// Order here is the order rails appear on the page. The first rail is the most
// valuable real estate on the whole listing page, so it's deliberately the one
// that answers the most time-sensitive question.

function definitions(category, { hasDistance }) {
  const isFood = FOOD_CATEGORIES.has(category)

  return [
    {
      key: 'open-now',
      eyebrow: 'Right now',
      title: 'Open right now',
      match: e => computeStatus(e.hours || [])?.cls === 'open',
      sort: hasDistance ? byDistance : byRating,
    },
    hasDistance && {
      key: 'near-you',
      eyebrow: 'Closest first',
      title: 'Near you',
      match: e => e.distance_miles != null && e.distance_miles <= 5,
      sort: byDistance,
    },
    {
      key: 'top-rated',
      eyebrow: 'Best reviewed',
      title: 'Top rated',
      // The review-count floor keeps a lone 5.0 with two reviews from
      // outranking a 4.7 with four hundred.
      match: e => (e.rating || 0) >= 4.5 && (e.review_count || 0) >= 20,
      sort: byRating,
    },
    {
      key: 'waterfront',
      eyebrow: 'On the Gulf',
      title: 'On the water',
      match: e => !!e.waterfront || hasTag(e, 'waterfront', 'beachfront', 'dockside', 'marina_view'),
      sort: byRating,
    },
    isFood && {
      key: 'happy-hour',
      eyebrow: 'Deals',
      title: 'Happy hour',
      match: e => !!e.hh_days || hasTag(e, 'happy_hour'),
      sort: byRating,
    },
    {
      key: 'live-music',
      eyebrow: 'Tonight',
      title: 'Live music',
      match: e => !!e.live_music || hasTag(e, 'live_music', 'live_dj', 'karaoke'),
      sort: byRating,
    },
    {
      key: 'outdoor',
      eyebrow: 'Outside',
      title: 'Outdoor seating',
      match: e => !!e.outdoor_seating || hasTag(e, 'outdoor_seating', 'patio', 'rooftop'),
      sort: byRating,
    },
    {
      key: 'family',
      eyebrow: 'With the kids',
      title: 'Good for families',
      match: e => !!e.good_for_children || hasTag(e, 'family_friendly', 'good_for_kids'),
      sort: byRating,
    },
    {
      key: 'dog-friendly',
      eyebrow: 'Bring the dog',
      title: 'Dog friendly',
      match: e => !!e.allows_dogs || hasTag(e, 'pet_friendly', 'dogs_allowed'),
      sort: byRating,
    },
  ].filter(Boolean)
}

// Subtype rails, generated from whatever is actually in the data rather than a
// hardcoded list — new subtypes show up on their own instead of silently
// falling into the catch-all.
function subtypeDefinitions(entities) {
  const counts = new Map()
  entities.forEach(e => {
    const s = (e.entity_subtype || '').trim()
    if (!s) return
    counts.set(s, (counts.get(s) || 0) + 1)
  })

  return Array.from(counts.entries())
    .filter(([, n]) => n >= MIN_PER_RAIL)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SUBTYPE_RAILS)
    .map(([subtype]) => ({
      key: `subtype:${subtype}`,
      eyebrow: 'By type',
      title: formatSubtypeLabel(subtype),
      match: e => e.entity_subtype === subtype,
      sort: byRating,
    }))
}

/**
 * Build the Browse view's rows.
 *
 * @param {Array}  entities
 * @param {Object} opts
 * @param {string} opts.category     e.g. 'restaurants' — drives food-only rails
 * @param {bool}   opts.hasDistance  whether distance_miles is populated
 * @returns {Array<{key, eyebrow, title, items, total, match}>}
 */
export function buildSections(entities, { category, hasDistance = false } = {}) {
  if (!entities || !entities.length) return []

  const defs = [...definitions(category, { hasDistance }), ...subtypeDefinitions(entities)]

  const appearances = new Map()   // slug → how many rails it's already in
  const placed = new Set()        // slugs that made it into at least one rail
  const sections = []
  let previousRail = new Set()    // members of the rail immediately above

  const idOf = e => e.slug || e.id

  for (const def of defs) {
    const all = entities.filter(def.match)
    // `total` counts everything that qualifies, not just what survived the
    // dedupe caps — "View all 47" has to mean 47, or the escape hatch lies.
    const total = all.length

    const items = all
      .filter(e => {
        const id = idOf(e)
        if ((appearances.get(id) || 0) >= MAX_APPEARANCES) return false
        // Back-to-back rails sharing cards is what makes a grouped page feel
        // like it's padding itself out.
        if (previousRail.has(id)) return false
        return true
      })
      .sort(def.sort)
      .slice(0, MAX_PER_RAIL)

    if (items.length < MIN_PER_RAIL) continue

    items.forEach(e => {
      const id = idOf(e)
      appearances.set(id, (appearances.get(id) || 0) + 1)
      placed.add(id)
    })

    sections.push({ key: def.key, eyebrow: def.eyebrow, title: def.title, items, total, match: def.match })
    previousRail = new Set(items.map(idOf))
  }

  // Catch-all so nothing is reachable only through the list view. Places that
  // matched no rail are, by definition, the ones with the thinnest data — which
  // is exactly why they'd otherwise never be seen.
  const leftovers = entities.filter(e => !placed.has(idOf(e)))
  if (leftovers.length) {
    sections.push({
      key: 'more',
      eyebrow: 'Everything else',
      title: 'More to explore',
      items: leftovers.slice(0, MAX_PER_RAIL).sort(byRating),
      total: leftovers.length,
      match: e => !placed.has(idOf(e)),
    })
  }

  return sections
}
