// ─── Facets ───────────────────────────────────────────────────────────────────
//
// "Is it a tag? Is it a subtype?" — the answer is that it doesn't matter. This
// module flattens every axis a place is classified on into one bag of tokens,
// so a single lookup can ask "is this a dolphin cruise?" without caring whether
// that fact came from entity_subtype, from a tag, or from a boolean column.
//
// This is what lets a tour agency that sells dolphin cruises land in the Dolphin
// Cruises row. Its subtype says `tour_agency`, but its tags say what it actually
// sells, and both go into the same bag.
//
// Why normalization matters: the live data spells the same concept many ways.
// Waterfront alone appears as `Waterfront Dining` (36), `waterfront` (35),
// `beachfront` (22), `waterfront dining` (12), `waterfront-dining` (11),
// `Waterfront` under two different tag_categories, `Waterfront Restaurants`, and
// half a dozen more. Grouping on the raw strings produces eight weak rows that
// are really one strong row of ~100.

// Tag categories that are machine plumbing rather than anything a visitor would
// browse by. These dominate raw tag volume — acceptsDebitCards and
// wheelchairAccessibleParking are the two most common tags on restaurants — so
// leaving them in would drown out the real vocabulary.
const SKIP_TAG_CATEGORIES = new Set([
  'google_type', 'google_types', 'google_primary_type', 'google_secondary_type',
  'location', 'payment', 'accessibility',
])

const isMachineSlug = (s) =>
  (/_/.test(s) && s === s.toLowerCase()) ||    // snake_case: point_of_interest
  (/^[a-z]+[A-Z]/.test(s) && !/\s/.test(s))    // camelCase: acceptsDebitCards

/** "Waterfront-Dining" → "waterfrontdining". Collapses case, spaces, hyphens. */
export const normKey = (s) =>
  String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// Boolean columns that carry classification meaning, mapped to the token they
// contribute. These are the best-populated axis on the table — serves_brunch is
// set on 94 restaurants where the subtype is just "restaurant" — so they rescue
// the ~42% of rows whose subtype says nothing useful.
const BOOLEAN_TOKENS = {
  serves_breakfast: 'breakfast',
  serves_brunch: 'brunch',
  serves_lunch: 'lunch',
  serves_dinner: 'dinner',
  serves_dessert: 'dessert',
  serves_vegetarian: 'vegetarian',
  serves_coffee: 'coffee',
  serves_beer: 'beer',
  serves_wine: 'wine',
  serves_cocktails: 'cocktails',
  outdoor_seating: 'outdoorseating',
  live_music: 'livemusic',
  reservable: 'reservations',
  delivery: 'delivery',
  takeout: 'takeout',
  good_for_children: 'familyfriendly',
  good_for_groups: 'goodforgroups',
  allows_dogs: 'dogfriendly',
  good_for_watching_sports: 'sportsbar',
}

/**
 * Every normalized token this entity is classified by, from every axis.
 * Cached on the entity so repeated rail matching doesn't redo the work.
 */
export function entityTokens(entity) {
  if (entity.__tokens) return entity.__tokens

  const tokens = new Set()
  const add = (raw) => {
    const k = normKey(raw)
    if (k.length >= 3) tokens.add(k)
  }

  add(entity.entity_subtype)
  add(entity.entity_type)
  ;(entity.secondary_subtypes || []).forEach(add)

  // What the place actually sells, derived server-side from entity_offer (see
  // gcr-api-clean/lib/concepts.js). This is the axis that finds a parasailing
  // trip sold by a business subtyped `travel_agency`, and it's where the thin
  // activity concepts live — pontoon rentals go from 5 findable places to 28,
  // paddleboard from 1 to 6, dolphin cruises from 57 to 84.
  ;(entity.concepts || []).forEach(add)

  for (const t of (entity.tags || [])) {
    const label = (typeof t === 'string' ? t : (t.tag_name || t.tag || '')).trim()
    if (!label) continue
    const cat = typeof t === 'object' ? (t.tag_category || '') : ''
    if (SKIP_TAG_CATEGORIES.has(cat)) continue
    if (isMachineSlug(label)) continue
    add(label)
  }

  for (const [col, token] of Object.entries(BOOLEAN_TOKENS)) {
    if (entity[col]) tokens.add(token)
  }

  // Happy hour is a schedule, not a flag, but for classification it's a yes/no.
  if (entity.hh_days || entity.hh_start) tokens.add('happyhour')

  Object.defineProperty(entity, '__tokens', { value: tokens, enumerable: false })
  return tokens
}

/**
 * Does this entity carry `key`?
 *
 * Long keys match as substrings so one key absorbs its compounds — `waterfront`
 * catches waterfrontdining and waterfrontrestaurants. Short keys must match
 * exactly, or `bar` would match everything from barbecue to barbershop.
 */
export function hasKey(entity, key) {
  const tokens = entityTokens(entity)
  if (tokens.has(key)) return true
  if (key.length < 6) return false
  for (const t of tokens) if (t.includes(key)) return true
  return false
}

export const matchesFacet = (entity, facet) => facet.keys.some(k => hasKey(entity, k))

// ─── Vocabulary ───────────────────────────────────────────────────────────────
//
// This is a *dictionary*, not a page layout. Nothing here says which rows appear
// on which page or in what order — railEngine.js decides that from the data, the
// clock and the user. What this provides is (a) display titles, and (b) synonym
// sets that normalization alone can't merge, because "beachfront" and
// "waterfront" share no substring.
//
// Anything not listed here still becomes a candidate row via auto-discovery, so
// a new tag added to the database shows up without a code change. Entries earn
// their place here only when they need a synonym merge or a better title.
//
// `intent` links a facet to a time of day. `weight` nudges facets that are
// reliably interesting (or reliably dull) regardless of size.

export const VOCAB = [
  // Water / location — the highest-value filter on the site and the most
  // fragmented in the data.
  { id: 'waterfront', title: 'On the water', weight: 1.5,
    keys: ['waterfront', 'beachfront', 'dockside', 'bayfront', 'gulffront', 'marinaview', 'onthewater'] },

  // Meal times. Each is pinned to when it's actually useful.
  { id: 'breakfast', title: 'Breakfast', intent: 'breakfast', keys: ['breakfast', 'bagel', 'donut'] },
  { id: 'brunch',    title: 'Brunch',    intent: 'brunch',    keys: ['brunch'] },
  { id: 'lunch',     title: 'Lunch',     intent: 'lunch',     keys: ['lunch'] },
  { id: 'dinner',    title: 'Dinner',    intent: 'dinner',    keys: ['dinner', 'finedining'] },
  { id: 'coffee',    title: 'Coffee',    intent: 'breakfast', keys: ['coffee', 'cafe', 'espresso'] },
  { id: 'dessert',   title: 'Sweets & dessert', keys: ['dessert', 'icecream', 'bakery', 'candy'] },

  { id: 'happyhour', title: 'Happy hour', intent: 'happyhour', weight: 1.3, keys: ['happyhour'] },
  { id: 'livemusic', title: 'Live music', intent: 'night', weight: 1.2,
    keys: ['livemusic', 'livedj', 'karaoke', 'livemusicvenues'] },
  { id: 'nightlife', title: 'Bars & nightlife', intent: 'night',
    keys: ['nightlife', 'barsnightlife', 'cocktails', 'brewery', 'sportsbar', 'beer', 'wine'] },

  // Cuisine
  { id: 'seafood',  title: 'Seafood',  weight: 1.4, keys: ['seafood', 'oyster', 'rawbar'] },
  { id: 'pizza',    title: 'Pizza',    keys: ['pizza'] },
  { id: 'burgers',  title: 'Burgers',  keys: ['hamburger', 'burger'] },
  { id: 'mexican',  title: 'Mexican',  keys: ['mexican', 'taco'] },
  { id: 'italian',  title: 'Italian',  keys: ['italian'] },
  { id: 'asian',    title: 'Asian',    keys: ['japanese', 'sushi', 'chinese', 'thai', 'korean', 'vietnamese', 'asian'] },
  { id: 'bbq',      title: 'BBQ',      keys: ['barbecue', 'bbq'] },
  { id: 'steak',    title: 'Steakhouses', keys: ['steakhouse', 'steak'] },
  { id: 'wings',    title: 'Wings & bar food', keys: ['wings', 'wingstop'] },
  { id: 'southern', title: 'Southern & cajun', keys: ['southern', 'cajun', 'creole', 'soulfood'] },

  // Things to do — the on-water activity vocabulary, all badly fragmented.
  { id: 'fishing',    title: 'Fishing charters', weight: 1.5,
    keys: ['fishingcharter', 'charterfishing', 'deepseafishing', 'fishing'] },
  { id: 'dolphin',    title: 'Dolphin cruises',  weight: 1.4,
    keys: ['dolphincruise', 'dolphintour', 'dolphinwatching', 'dolphin'] },
  { id: 'parasailing', title: 'Parasailing', weight: 1.3, keys: ['parasail', 'parasailing'] },
  { id: 'jetski',     title: 'Jet skis & watersports', weight: 1.2,
    keys: ['jetski', 'waverunner', 'watersport', 'jetskiing'] },
  { id: 'paddle',     title: 'Kayak & paddleboard',
    keys: ['kayak', 'paddleboard', 'paddlesport', 'canoe', 'sup'] },
  { id: 'boatrental', title: 'Boat & pontoon rentals', weight: 1.2,
    keys: ['boatrental', 'pontoon', 'boatrentals', 'tritoon'] },
  { id: 'sailing',    title: 'Cruises & boat tours',
    keys: ['sailing', 'sailingcharter', 'sunsetcruise', 'cruise', 'boattour'] },
  { id: 'helicopter', title: 'Scenic flights', keys: ['helicopter', 'airtour'] },
  { id: 'marina',     title: 'Marinas & slips', keys: ['marina', 'boatslip'] },
  { id: 'golf',       title: 'Golf', keys: ['golf', 'golfcourse', 'minigolf'] },
  { id: 'outdoors',   title: 'Parks & trails', keys: ['hiking', 'trail', 'natureprese', 'campground', 'statepark'] },
  { id: 'attraction', title: 'Attractions',
    keys: ['attraction', 'touristattraction', 'amusement', 'museum', 'zoo', 'aquarium', 'waterpark'] },

  // Services — five separate salon subtypes are one strong row, not five weak
  // ones (hair 36 + spa 33 + nails 27 + beauty 23 + massage 23).
  { id: 'spa',        title: 'Spa & massage', weight: 1.2, keys: ['spa', 'massage', 'daysp', 'wellnesscenter'] },
  { id: 'hairnails',  title: 'Hair & nails', keys: ['hairsalon', 'nailsalon', 'beautysalon', 'barbershop', 'hairca'] },
  { id: 'photo',      title: 'Photographers', weight: 1.2, keys: ['photographer', 'photography', 'photostudio'] },
  { id: 'gearrental', title: 'Beach & equipment rentals', weight: 1.3,
    keys: ['rentals', 'beachrental', 'equipmentrental', 'chairrental', 'bikerental', 'cartrental'] },
  { id: 'transport',  title: 'Getting around', weight: 1.2,
    keys: ['transportationservice', 'airportshuttle', 'carrental', 'taxi', 'shuttle', 'limo', 'golfcartrental'] },
  { id: 'fitness',    title: 'Fitness', keys: ['gym', 'fitness', 'yoga', 'pilates'] },

  // Audience / vibe
  { id: 'family',   title: 'Good for families', keys: ['familyfriendly', 'goodforkids', 'familyrestaurants'] },
  { id: 'dog',      title: 'Dog friendly', keys: ['dogfriendly', 'petfriendly', 'dogsallowed'] },
  { id: 'outdoor',  title: 'Outdoor seating', keys: ['outdoorseating', 'patio', 'rooftop'] },
  { id: 'romantic', title: 'Date night', intent: 'dinner', keys: ['romantic', 'datenight', 'finedining', 'upscale'] },
  { id: 'groups',   title: 'Good for groups', keys: ['goodforgroups', 'largeparties'] },
]

const VOCAB_BY_ID = new Map(VOCAB.map(f => [f.id, f]))
export const facetById = (id) => VOCAB_BY_ID.get(id)

// Every key claimed by the vocabulary, so auto-discovery doesn't re-propose a
// row that a curated facet already covers under a nicer title.
const CLAIMED = new Set(VOCAB.flatMap(f => f.keys))

// Tokens that describe everything and therefore separate nothing. These come
// from entity_type and the generic catch-all subtypes: 42% of restaurants are
// subtyped `restaurant`, so "Restaurant" would otherwise be the biggest
// discovered row on the Restaurants page.
const STOPWORDS = new Set([
  'restaurant', 'restaurants', 'service', 'services', 'activity', 'activities',
  'shopping', 'store', 'food', 'foodanddrink', 'business', 'place', 'establishment',
  'pointofinterest', 'allrestaurants', 'casualdining', 'lodging', 'hotel', 'condo',
  'vacationrental', 'park', 'coffee', 'entertainment', 'health', 'attraction',
  'touristattraction', 'travelagency', 'touragency', 'realestateagency', 'bank',
])

/**
 * Propose rows straight from the data — every token common enough to fill a row
 * and selective enough to mean something, minus what the vocabulary already
 * covers. This is what lets a tag added to the database tomorrow become a row
 * without anyone editing code.
 */
export function discoverFacets(entities, { minCount = 4, maxShare = 0.35 } = {}) {
  const counts = new Map()
  const labels = new Map()

  for (const e of entities) {
    for (const token of entityTokens(e)) {
      if (STOPWORDS.has(token) || CLAIMED.has(token)) continue
      counts.set(token, (counts.get(token) || 0) + 1)
    }
    // Remember a human spelling for each token — the tags carry real casing
    // ("Waterfront Dining"), the subtypes don't ("seafood_restaurant").
    for (const t of (e.tags || [])) {
      const label = (typeof t === 'string' ? t : (t.tag_name || t.tag || '')).trim()
      if (label && !isMachineSlug(label)) {
        const k = normKey(label)
        if (!labels.has(k)) labels.set(k, label)
      }
    }
    if (e.entity_subtype) {
      const k = normKey(e.entity_subtype)
      if (!labels.has(k)) {
        labels.set(k, e.entity_subtype.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
      }
    }
  }

  const ceiling = Math.max(minCount, Math.floor(entities.length * maxShare))

  return Array.from(counts.entries())
    .filter(([, n]) => n >= minCount && n <= ceiling)
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => ({
      id: `auto:${token}`,
      title: labels.get(token) || token,
      keys: [token],
      discovered: true,
    }))
}
