import { computeStatus, shortStatus, fmt12, fmtDist } from './hours'
import { formatSubtypeLabel } from '../categoryMap'

// ─── What a mini card shows, per page ─────────────────────────────────────────
//
// The mini card's skeleton is fixed — one badge, a name, one meta line, and up
// to three foot stats — because rows only read as a single grid when every card
// is the same shape. What *fills* those slots is not fixed: the decisive fact on
// a coffee shop (is it still open? they shut at 2pm) is not the decisive fact on
// a charter boat (what does it cost and how long is it?).
//
// So each page gets its own slot mapping below. The rules that don't bend:
//
//   · exactly one badge, never a stack — stacking badges is how GCRCard got to
//     be too heavy to put in a row
//   · at most three foot stats, each of which drops out cleanly when its column
//     is null rather than rendering an empty label
//   · the meta line is always "what it is · where it is", on every page, so
//     there's one line whose meaning never moves between pages
//
// Anything that doesn't fit those slots belongs on the profile, not here.

const money = (n) => {
  const v = Number(n)
  if (!Number.isFinite(v)) return null
  return v % 1 === 0 ? `$${v}` : `$${v.toFixed(2)}`
}

// price_range is free text ("$$"); price_level is 1–4. Prefer the text the
// business actually set, fall back to the Google-derived number.
function priceTier(e) {
  if (e.price_range && /^\$+$/.test(e.price_range.trim())) return e.price_range.trim()
  if (e.price_level) return '$'.repeat(Math.min(Number(e.price_level), 4))
  return null
}

function fromPrice(e, { withUnit = true } = {}) {
  if (e.price_from == null || e.price_from === '') return null
  const v = Number(e.price_from)
  if (v === 0) return 'Free'
  const amount = money(v)
  if (!amount) return null
  // "per person" → "/person", which is the only form that fits the badge.
  const unit = withUnit && e.price_unit ? `/${String(e.price_unit).replace(/^per\s+/i, '')}` : ''
  return `From ${amount}${unit}`
}

// Is the happy hour running right now? hh_start/hh_end are plain times, so this
// is a same-day comparison — a window that crosses midnight reads as "not on",
// which is the safe way to be wrong.
function happyHourLive(e) {
  if (!e.hh_start || !e.hh_end) return false
  const [sh, sm] = String(e.hh_start).split(':').map(Number)
  const [eh, em] = String(e.hh_end).split(':').map(Number)
  const now = new Date().getHours() * 60 + new Date().getMinutes()
  return now >= sh * 60 + (sm || 0) && now <= eh * 60 + (em || 0)
}

function happyHourBadge(e) {
  if (!e.hh_days && !e.hh_start) return null
  if (happyHourLive(e)) return { label: 'Happy hour on now', tone: 'deal' }
  if (e.hh_start && e.hh_end) return { label: `HH ${fmt12(e.hh_start)}–${fmt12(e.hh_end)}`, tone: 'deal' }
  return { label: 'Happy hour', tone: 'deal' }
}

function openBadge(e) {
  const s = shortStatus(e.hours || [])
  return s ? { label: s.label, tone: s.cls } : null
}

// Nightlife's useful fact isn't "open" — almost everything is open at 9pm — it's
// how late it runs.
function lateBadge(e) {
  const full = computeStatus(e.hours || [])
  if (!full) return null
  if (full.cls === 'open') {
    const m = full.label.match(/Closes (.+)$/)
    return { label: m ? `Til ${m[1]}` : 'Open', tone: 'open' }
  }
  return { label: shortStatus(e.hours || [])?.label || 'Closed', tone: full.cls }
}

function priceBadge(e) {
  const p = fromPrice(e)
  if (!p) return null
  return { label: p, tone: p === 'Free' ? 'free' : 'price' }
}

// The last-resort badge, and the primary one on pages where nothing better is
// populated. entity_subtype is the best-filled column on the table (87–97%
// depending on page), so this is what keeps cards from going badge-less.
//
// `fromSubtype` tells getMiniCardFields to drop the subtype out of the meta
// line, so the card doesn't say "Condo" twice.
function subtypeBadge(e) {
  const label = formatSubtypeLabel(e.entity_subtype || e.entity_type || '')
  return label ? { label, tone: 'neutral', fromSubtype: true } : null
}

// ─── Foot stats ───────────────────────────────────────────────────────────────

const statRating = (e) =>
  e.rating != null && e.rating !== '' ? { key: 'rating', label: `⭐ ${Number(e.rating).toFixed(1)}` } : null

const statDistance = (e) => {
  const d = fmtDist(e.distance_miles)
  return d ? { key: 'dist', label: `📍 ${d}`, muted: true } : null
}

const statPrice = (e) => {
  const t = priceTier(e)
  return t ? { key: 'price', label: t, muted: true } : null
}

const statDuration = (e) =>
  e.duration_text ? { key: 'dur', label: `⏱ ${e.duration_text}`, muted: true } : null

const statSleeps = (e) => {
  const n = e.sleeps_max || e.sleeps_min
  return n ? { key: 'sleeps', label: `🛏 Sleeps ${n}`, muted: true } : null
}

const statGroup = (e) =>
  e.capacity_max ? { key: 'cap', label: `👥 Up to ${e.capacity_max}`, muted: true } : null

const statLiveMusic = (e) =>
  e.live_music ? { key: 'music', label: '🎸 Live', muted: true } : null

const statReviews = (e) =>
  e.review_count > 0 ? { key: 'reviews', label: `${e.review_count} reviews`, muted: true } : null

// ─── Per-page mapping ─────────────────────────────────────────────────────────
//
// `badge` runs top to bottom, first non-null wins. `stats` is filtered to the
// first three that resolve, so a place with thin data degrades to just a rating
// rather than to a row of empty slots.

const PAGES = {
  // Can I eat there now, is it good, what will it cost.
  restaurants: {
    badge: [openBadge],
    stats: [statRating, statPrice, statDistance],
  },

  // These close early and unpredictably, so open/closed outranks everything.
  coffee: {
    badge: [openBadge],
    stats: [statRating, statDistance],
  },

  // When does it start / is it running right now.
  'happy-hours': {
    badge: [happyHourBadge, openBadge],
    stats: [statRating, statPrice, statDistance],
  },

  // How late does it go, and is there anything on tonight.
  nightlife: {
    badge: [lateBadge],
    stats: [statRating, statLiveMusic, statPrice],
  },

  // What does it cost and how long does it take. Booking scarcity, where we have
  // it, is the most time-sensitive thing on the whole card.
  'things-to-do': {
    badge: [priceBadge, openBadge],
    stats: [statDuration, statRating, statGroup],
  },

  // Stays carry almost no structured data today — price_from, bedrooms, sleeps
  // and pool are all ~0% filled, and only ~20% have hours. entity_subtype is
  // ~97% filled and is genuinely the thing that separates a condo from a hotel
  // from a beach house, so it leads. Revisit the moment rates get imported:
  // a nightly rate should outrank the subtype the day it exists.
  staying: {
    badge: [priceBadge, subtypeBadge],
    stats: [statRating, statSleeps, statDistance],
  },

  shopping: {
    badge: [openBadge],
    stats: [statRating, statDistance],
  },

  // Services are picked on credibility, not proximity — reviews carry more here
  // than a distance that's usually irrelevant for someone who travels to you.
  services: {
    badge: [priceBadge, openBadge],
    stats: [statRating, statReviews, statDistance],
  },

  // Beaches and parks. Tempting to badge these "Free", but the data doesn't
  // support the claim — no park row has price_from set at all, not even to 0,
  // and some state parks do charge admission. Badging a paid park as free is a
  // factual error on the business's card, so open/closed leads instead and the
  // subtype carries the rest.
  'public-spots': {
    badge: [openBadge, subtypeBadge],
    stats: [statDistance, statRating],
  },

  marinas: {
    badge: [openBadge],
    stats: [statDistance, statRating],
  },

  wellness: {
    badge: [openBadge],
    stats: [statRating, statDistance],
  },
}

// Aliases — CategoryPage routes and CategoryListings params don't use the same
// slugs for the same page.
PAGES['coffee-sweets'] = PAGES.coffee
PAGES.stays = PAGES.staying

const DEFAULT_PAGE = {
  badge: [openBadge],
  stats: [statRating, statDistance],
}

const MAX_STATS = 3

/**
 * Resolve what this entity shows on this page's mini card.
 *
 * @returns {{ badge: {label, tone}|null, meta: string, stats: Array<{key,label,muted}> }}
 */
export function getMiniCardFields(entity, category) {
  const page = PAGES[category] || DEFAULT_PAGE

  // Live booking scarcity outranks every per-page badge, on every page. It's the
  // only thing on the card that expires within the hour.
  const spots = entity.spots_remaining
  let badge = null
  if (spots != null && spots <= 5) {
    badge = spots === 0
      ? { label: 'Fully booked', tone: 'gone' }
      : { label: spots === 1 ? 'Last spot' : `${spots} left`, tone: 'scarce' }
  } else {
    // subtypeBadge backstops every page: hours are 17–87% filled depending on
    // the page, so without it a real share of cards would carry no badge at all
    // and the row would look ragged.
    for (const fn of [...page.badge, subtypeBadge]) {
      badge = fn(entity)
      if (badge) break
    }
  }

  const subtype = (entity.entity_subtype || entity.entity_type || entity.type || '')
    .toLowerCase().replace(/_/g, ' ')
  const meta = badge?.fromSubtype
    ? entity.city || ''
    : [subtype, entity.city].filter(Boolean).join(' · ')

  const stats = page.stats
    .map(fn => fn(entity))
    .filter(Boolean)
    .slice(0, MAX_STATS)

  return { badge, meta, stats }
}
