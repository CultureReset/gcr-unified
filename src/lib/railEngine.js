import { computeStatus } from './hours'
import { VOCAB, discoverFacets, matchesFacet, entityTokens, normKey } from './facets'

// ─── Rail engine ──────────────────────────────────────────────────────────────
//
// Nothing here is a fixed list of rows per page. Every candidate row is scored
// against three things and the top scorers win:
//
//   1. the data      — how many places match, how selective, how well filled
//   2. the clock     — breakfast in the morning, happy hour at 4pm, live music
//                      at 10pm, and happy hour boosted again when it's actually
//                      running right now
//   3. the user      — their Trip Swipe preference scores, so someone who keeps
//                      swiping right on live music gets that row moved up
//
// So the Restaurants page at 8am for a stranger and at 5pm for someone who loves
// happy hours are different pages, built from the same code and no page-specific
// layout anywhere.

const MAX_PER_RAIL = 12
const MIN_PER_RAIL = 4
const MAX_APPEARANCES = 2
const MAX_RAILS = 12

const byRating = (a, b) => (b.rating || 0) - (a.rating || 0)
const byDistance = (a, b) => (a.distance_miles ?? 9999) - (b.distance_miles ?? 9999)

// ─── Clock ────────────────────────────────────────────────────────────────────

/**
 * What time it is, in terms a rail can be scored against. Windows overlap on
 * purpose — at 5pm both happy hour and dinner are live, and both rows deserve
 * to be near the top.
 */
export function timeContext(now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes()
  const day = now.getDay()
  const isWeekend = day === 0 || day === 6

  const win = (from, to) => mins >= from && mins < to

  return {
    mins,
    isWeekend,
    intents: {
      breakfast: win(5 * 60, 11 * 60) ? 1 : win(11 * 60, 12 * 60) ? 0.3 : 0,
      brunch:    isWeekend && win(9 * 60, 14 * 60) ? 1 : win(10 * 60, 13 * 60) ? 0.4 : 0,
      lunch:     win(11 * 60, 15 * 60) ? 1 : 0,
      happyhour: win(14 * 60, 19 * 60) ? 1 : win(19 * 60, 20 * 60) ? 0.4 : 0,
      dinner:    win(16 * 60 + 30, 21 * 60 + 30) ? 1 : 0,
      night:     mins >= 20 * 60 || mins < 2 * 60 ? 1 : win(18 * 60, 20 * 60) ? 0.4 : 0,
    },
  }
}

/** Is this place's happy hour running at this moment? */
function happyHourLive(e, mins) {
  // hh_days is what actually marks a place as having a happy hour; start/end
  // times can be left populated on rows that don't run one, and counting those
  // would sweep the whole page into the row.
  if (!e.hh_days) return false
  if (!e.hh_start || !e.hh_end) return false
  const [sh, sm] = String(e.hh_start).split(':').map(Number)
  const [eh, em] = String(e.hh_end).split(':').map(Number)
  const start = sh * 60 + (sm || 0)
  const end = eh * 60 + (em || 0)
  return mins >= start && mins <= end
}

// ─── Computed rails ───────────────────────────────────────────────────────────
//
// Rows that aren't a facet lookup — they're a calculation over the whole set.

function computedCandidates(entities, ctx, prefs) {
  const out = []

  out.push({
    id: 'top-rated',
    title: 'Top rated',
    eyebrow: 'Best reviewed',
    // The review floor stops a lone 5.0 with three reviews outranking a 4.7
    // with four hundred.
    match: e => (e.rating || 0) >= 4.5 && (e.review_count || 0) >= 20,
    sort: byRating,
    weight: 1.6,
  })

  const hasDistance = entities.some(e => e.distance_miles != null)
  if (hasDistance) {
    out.push({
      id: 'near-you',
      title: 'Near you',
      eyebrow: 'Closest first',
      match: e => e.distance_miles != null && e.distance_miles <= 5,
      sort: byDistance,
      weight: 1.3,
    })
  }

  // "Open right now" earns its place only when it's actually discriminating.
  // At 1pm nearly everything is open and the row is noise; at 9pm it's the most
  // useful thing on the page. The selectivity check below handles that
  // automatically, so this just needs to exist as a candidate.
  out.push({
    id: 'open-now',
    title: 'Open right now',
    eyebrow: 'Right now',
    match: e => computeStatus(e.hours || [])?.cls === 'open',
    sort: hasDistance ? byDistance : byRating,
    weight: ctx.intents.night > 0 ? 1.2 : 0.7,
  })

  // Happy hour running *this minute* — distinct from the "has a happy hour"
  // facet, and worth surfacing on Restaurants even though Happy Hours has its
  // own page.
  const liveHH = entities.filter(e => happyHourLive(e, ctx.mins))
  if (liveHH.length >= MIN_PER_RAIL) {
    out.push({
      id: 'happy-hour-live',
      title: 'Happy hour on now',
      eyebrow: 'Right now',
      match: e => happyHourLive(e, ctx.mins),
      sort: byRating,
      // Carries the same time intent as the generic happy-hour facet so it
      // collects the same clock boost — otherwise the facet outscores it and
      // gets placed first, and supersession (which only looks forward) never
      // fires.
      intent: 'happyhour',
      weight: 2.2,
      // While it's actually running, the live row is strictly better than the
      // generic "has a happy hour" one — same places, more urgent framing.
      supersedes: ['happyhour'],
    })
  }

  // Personalized row. Built only when there's enough signal to fill it with
  // something better than chance — an empty or near-random "Recommended for
  // you" in the top slot is worse than no row at all.
  if (prefs && prefs.signalStrength >= 1) {
    const scored = entities
      .map(e => ({ e, s: affinity(e, prefs) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
    if (scored.length >= MIN_PER_RAIL) {
      const picked = new Set(scored.slice(0, MAX_PER_RAIL * 2).map(x => x.e.slug || x.e.id))
      out.push({
        id: 'recommended',
        title: 'Recommended for you',
        eyebrow: 'Based on your swipes',
        match: e => picked.has(e.slug || e.id),
        sort: (a, b) => affinity(b, prefs) - affinity(a, prefs),
        weight: 3,           // always first when it exists
        skipSelectivity: true,
      })
    }
  }

  return out
}

/**
 * How well one place matches a user's learned tag scores.
 *
 * Matches the same way facets do — a preference for `seafood` has to credit a
 * place whose only token is `seafoodrestaurant`, or the personalized row keeps
 * coming up empty for users whose tastes the rest of the engine can clearly see.
 */
function affinity(entity, prefs) {
  if (!prefs?.keys?.length) return 0
  const tokens = entityTokens(entity)
  let total = 0
  for (const { key, score } of prefs.keys) {
    if (tokens.has(key)) { total += score; continue }
    if (key.length < 6) continue
    for (const t of tokens) {
      if (t.includes(key) || key.includes(t)) { total += score; break }
    }
  }
  return total
}

/**
 * Turn the raw tag→score map from /api/tourist/preferences into something the
 * engine can use, keyed the same way facets are so the two can be compared.
 */
export function buildPrefs(rawScores) {
  if (!rawScores) return null
  const scores = {}
  let positives = 0
  for (const [tag, score] of Object.entries(rawScores)) {
    const k = normKey(tag)
    if (!k) continue
    scores[k] = (scores[k] || 0) + score
    if (score > 0) positives++
  }
  // Pre-flattened for affinity()'s inner loop, which runs per entity.
  const keys = Object.entries(scores).map(([key, score]) => ({ key, score }))
  return { scores, keys, signalStrength: positives }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function scoreCandidate(cand, items, total, ctx, prefs) {
  const n = items.length
  if (n < MIN_PER_RAIL) return -1

  const share = n / total

  // Selectivity. A row holding half the page isn't a filter, it's the page
  // again — takeout (348 of 691 restaurants) is the classic example. A row of
  // five is thin but still worth showing.
  if (!cand.skipSelectivity) {
    if (share > 0.55) return -1
    if (share > 0.4) return 0.2
  }

  // Peaks around a quarter of the page: big enough to be worth a row, small
  // enough to mean something.
  const selectivity = 1 - Math.abs(share - 0.22) * 1.8

  // Rows whose members have photos and ratings look better and click better.
  const sample = items.slice(0, MAX_PER_RAIL)
  const withPhoto = sample.filter(e => e.hero_image_url || e.photos?.length).length / sample.length
  const withRating = sample.filter(e => e.rating != null).length / sample.length
  const quality = withPhoto * 0.6 + withRating * 0.4

  // Clock.
  const intent = cand.intent
  const timeBoost = intent ? (ctx.intents[intent] || 0) * 1.8 : 0

  // User. A row whose concept the user keeps swiping right on climbs.
  let affinityBoost = 0
  if (prefs?.scores && cand.keys) {
    const hits = cand.keys.map(k => prefs.scores[k] || 0).filter(Boolean)
    if (hits.length) {
      affinityBoost = Math.min(2, Math.max(...hits) / 15)
    }
  }

  const base = (cand.weight ?? 1)
  return base * (0.6 + selectivity * 0.5 + quality * 0.5) + timeBoost + affinityBoost
}

// ─── Build ────────────────────────────────────────────────────────────────────

/**
 * @param {Array}  entities
 * @param {Object} opts
 * @param {Object} opts.prefs  from buildPrefs(), or null for an anonymous visitor
 * @param {Date}   opts.now    injectable for testing
 * @returns {Array<{key,title,eyebrow,items,total,match}>}
 */
export function buildRails(entities, { prefs = null, now = new Date() } = {}) {
  if (!entities?.length) return []

  const ctx = timeContext(now)
  const total = entities.length

  // Candidates: computed rows, the curated vocabulary, and whatever the data
  // itself suggests. All three compete on the same scale.
  const facetCands = VOCAB.map(f => ({
    id: f.id, title: f.title, keys: f.keys, intent: f.intent, weight: f.weight,
    match: e => matchesFacet(e, f), sort: byRating,
  }))

  const discovered = discoverFacets(entities).map(f => ({
    id: f.id, title: f.title, keys: f.keys, discovered: true,
    match: e => matchesFacet(e, f), sort: byRating,
    weight: 0.8,   // a curated row of the same size wins the slot
  }))

  const candidates = [
    ...computedCandidates(entities, ctx, prefs),
    ...facetCands,
    ...discovered,
  ]

  // Score everything, then take the winners.
  const scored = candidates
    .map(c => {
      const items = entities.filter(c.match)
      return { cand: c, items, score: scoreCandidate(c, items, total, ctx, prefs) }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)

  // Fill rows in score order, keeping any one place from carpeting the page.
  const appearances = new Map()
  const placed = new Set()
  const rails = []
  let previous = new Set()
  const idOf = e => e.slug || e.id
  // Rows made redundant by a higher-scoring row that already went in.
  const superseded = new Set()

  for (const { cand, items: all } of scored) {
    if (rails.length >= MAX_RAILS) break
    if (superseded.has(cand.id)) continue

    const items = all
      .filter(e => {
        const id = idOf(e)
        if ((appearances.get(id) || 0) >= MAX_APPEARANCES) return false
        if (previous.has(id)) return false   // no back-to-back repeats
        return true
      })
      .sort(cand.sort || byRating)
      .slice(0, MAX_PER_RAIL)

    if (items.length < MIN_PER_RAIL) continue

    ;(cand.supersedes || []).forEach(id => superseded.add(id))
    items.forEach(e => {
      const id = idOf(e)
      appearances.set(id, (appearances.get(id) || 0) + 1)
      placed.add(id)
    })

    rails.push({
      key: cand.id,
      title: cand.title,
      eyebrow: cand.eyebrow || (cand.discovered ? 'Also here' : 'Browse'),
      items,
      total: all.length,
      match: cand.match,
    })
    previous = new Set(items.map(idOf))
  }

  // Nothing should be reachable only through the list view. Places that matched
  // no row are the ones with the thinnest data, which is exactly why they'd
  // otherwise never be seen.
  const leftovers = entities.filter(e => !placed.has(idOf(e)))
  if (leftovers.length) {
    rails.push({
      key: 'more',
      title: 'More to explore',
      eyebrow: 'Everything else',
      items: leftovers.slice().sort(byRating).slice(0, MAX_PER_RAIL),
      total: leftovers.length,
      match: e => !placed.has(idOf(e)),
    })
  }

  return rails
}
