// The public layer's reads and writes against gcr-api-clean.
//
// Routes that exist today are used as they are. Routes the public layer needs
// but gcr-api-clean does not serve yet are called at the shape agreed in the
// final report; when one answers 404 the caller gets a NotConnected error and
// shows a clean "not available yet" state. Nothing here invents data.

import { API_BASE } from '../config'
import { cachedFetchJson } from './gcrApi'

export class NotConnected extends Error {
  constructor(route) {
    super('This is not available yet.')
    this.name = 'NotConnected'
    this.route = route
    this.notConnected = true
  }
}

async function readJson(res) {
  const text = await res.text().catch(() => '')
  if (!text) return null
  try { return JSON.parse(text) } catch { return null }
}

// An Express "no such route" 404 has no JSON error body of our own, or says so.
function isMissingRoute(res, body) {
  if (![404, 405, 501].includes(res.status)) return false
  if (!body || typeof body !== 'object') return true
  return body.error === 'API route not found' || body.code === 'not_connected' || body.code === 'not_configured'
}

export async function request(method, path, { body, signal, notFound } = {}) {
  const url = `${API_BASE}${path}`
  let res
  try {
    res = await fetch(url, {
      method,
      headers: body === undefined ? { Accept: 'application/json' } : { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('Could not reach the server. Check your connection and try again.')
  }
  const data = await readJson(res)
  if (!res.ok) {
    if (isMissingRoute(res, data)) throw new NotConnected(path)
    if (res.status === 404 && notFound) throw Object.assign(new Error(notFound), { status: 404 })
    const msg = (data && (data.error || data.message)) || `Request failed (HTTP ${res.status})`
    throw Object.assign(new Error(msg), { status: res.status, body: data })
  }
  return data
}

const enc = encodeURIComponent

/* ── One business ─────────────────────────────────────────────────────── */

/** The business's facts (exists: GET /api/gcr/entity/:slug). */
export function fetchEntity(slug) {
  return cachedFetchJson(`${API_BASE}/api/gcr/entity/${enc(slug)}`, { ttlMs: 120000, errorMessage: 'This business could not be loaded.' })
}

export { normaliseModule, arrangeModules } from '../utils/modules.js'
import { arrangeModules } from '../utils/modules.js'

/**
 * The business's public page: its shell and its installed public modules,
 * from gcr-api-clean's runtime projection (business_app_instances).
 * PROPOSED: GET /api/public/business/:slug/apps → { shell?, apps: [...] }.
 */
export async function fetchPageModules(slug, { signal } = {}) {
  const body = await request('GET', `/api/public/business/${enc(slug)}/apps`, { signal })
  const rows = Array.isArray(body) ? body : body?.apps || body?.modules || []
  return { shell: (body && !Array.isArray(body) && body.shell) || null, modules: arrangeModules(rows) }
}

/** "Ask this business" — PROPOSED: POST /api/public/business/:slug/chat. */
export function askBusiness(slug, { message, conversationId }) {
  return request('POST', `/api/public/business/${enc(slug)}/chat`, { body: { message, conversationId: conversationId || undefined } })
}

/* ── Directory ────────────────────────────────────────────────────────── */

/** Sections (listing categories) with counts, and the subtype map (exists: GET /api/gcr/taxonomy). */
export function fetchTaxonomy() {
  return cachedFetchJson(`${API_BASE}/api/gcr/taxonomy`, { ttlMs: 3600000, errorMessage: 'Categories could not be loaded.' })
}

/** Free-text search across every business's facts (exists: POST /api/gcr/search). */
export function searchDirectory({ query, city, limit = 60, signal }) {
  return request('POST', '/api/gcr/search', { body: { query, city: city || undefined, limit }, signal })
}

/**
 * Live availability across businesses for a date range
 * (exists: POST /api/gcr/availability-search). Returns a slug → summary map
 * of the businesses that publish open slots.
 */
export async function fetchAvailabilityMap({ dateFrom, dateTo, signal } = {}) {
  const body = await request('POST', '/api/gcr/availability-search', { body: { date_from: dateFrom, date_to: dateTo || dateFrom, limit: 500 }, signal })
  const map = {}
  for (const r of body?.results || []) {
    if (!r?.slug || !r.has_availability) continue
    map[r.slug] = { dates: r.available_dates || [], remaining: r.lowest_remaining ?? null, slots: r.slots || [] }
  }
  return map
}

/** Deals and last-minute openings businesses publish (exists: GET /api/deals). */
export async function fetchOpenings({ todayOnly = false, signal } = {}) {
  const qs = todayOnly ? '?today_only=true' : ''
  const body = await request('GET', `/api/deals${qs}`, { signal })
  return Array.isArray(body) ? body : body?.deals || []
}

/* ── Concierge, results pages, trip plans ─────────────────────────────── */

/**
 * The web concierge over the public MCP.
 * PROPOSED: POST /api/public/concierge/chat { message, conversationId? }
 *   → { reply, conversationId, places?: [{ slug, name, why? }], resultsCode? }
 */
export function conciergeChat({ message, conversationId }) {
  return request('POST', '/api/public/concierge/chat', { body: { message, conversationId: conversationId || undefined } })
}

/**
 * A results page or shared trip plan.
 * PROPOSED: GET /api/public/results/:code
 *   → { code, kind: 'results' | 'trip', title, summary?, createdAt, expiresAt,
 *       items: [{ slug, note?, at?, why? }] }
 * An expired code answers 410.
 */
export function fetchResults(code) {
  return request('GET', `/api/public/results/${enc(code)}`, { notFound: 'This link has expired or does not exist.' })
}

/** PROPOSED: POST /api/public/results { kind, title, items, conversationId? } → { code, expiresAt } */
export function createResults({ kind, title, items, conversationId }) {
  return request('POST', '/api/public/results', { body: { kind, title, items, conversationId: conversationId || undefined } })
}

/** PROPOSED: POST /api/public/results/:code/send { phone } → { sent: true } (the concierge number texts the link). */
export function sendResults(code, phone) {
  return request('POST', `/api/public/results/${enc(code)}/send`, { body: { phone } })
}
