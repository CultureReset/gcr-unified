// Page, module and action analytics (views, clicks, submissions) through one
// call. PROPOSED gcr-api-clean route: POST /api/public/analytics
//   { events: [{ type: 'view'|'click'|'submit', slug, installId?, appKey?, target?, path, at }] }
// Until it exists (404), tracking switches itself off for the session and is
// a no-op — it never blocks or breaks a page.

import { API_BASE } from '../config'

const queue = []
let timer = null
let disabled = false

function flush() {
  timer = null
  if (disabled || !queue.length || !API_BASE) { queue.length = 0; return }
  const events = queue.splice(0, queue.length)
  fetch(`${API_BASE}/api/public/analytics`, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
  }).then(res => {
    if ([404, 405, 501].includes(res.status)) disabled = true
  }).catch(() => {})
}

/** Record one event. Batched briefly; silently dropped when the route is not there. */
export function track(type, { slug, installId, appKey, target } = {}) {
  if (disabled || typeof window === 'undefined') return
  queue.push({
    type,
    slug: slug || undefined,
    installId: installId || undefined,
    appKey: appKey || undefined,
    target: target || undefined,
    path: window.location.pathname,
    at: new Date().toISOString(),
  })
  if (!timer) timer = setTimeout(flush, 800)
}
