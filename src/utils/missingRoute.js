// When does an error answer mean "gcr-api-clean has no such route (yet)"?
// One rule, the same one Plat-admin uses (src/api/errors.js, isMissingEndpoint),
// shared by the SPA (services/publicApi.js) and scripts/prerender.mjs. Pure;
// tested by node --test.

/** What Paperclip's /api catch-all answers for a path no router claims (server/src/app.ts). */
const ROUTE_NOT_FOUND = new Set(['API route not found'])

/** Codes a gcr-api-clean handler answers with when a feature is not wired up. */
const NOT_CONNECTED_CODES = new Set(['not_connected', 'not_configured'])

/**
 * A 404 counts only when no handler answered: Express's default text/html
 * page (gcr-api-clean has no JSON catch-all), an empty body, or Paperclip's
 * catch-all. A 404 carrying a handler's own message is a missing resource
 * ("Business not found"), which is a real answer, not a missing route.
 */
export function isMissingRoute(status, body) {
  if (status === 405 || status === 501) return true
  if (status !== 404) return false
  if (!body || typeof body !== 'object') return true
  if (NOT_CONNECTED_CODES.has(body.code)) return true
  const message = body.error || body.message || body.detail
  return typeof message !== 'string' || ROUTE_NOT_FOUND.has(message)
}
