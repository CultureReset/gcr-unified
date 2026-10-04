// Display helpers for the public layer. Pure; no Vite imports (tested by node --test).

export function money(amount, currency) {
  const n = Number(amount)
  if (amount === null || amount === undefined || amount === '' || !Number.isFinite(n)) return ''
  if (!currency) return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
  try {
    return n.toLocaleString(undefined, { style: 'currency', currency, maximumFractionDigits: n % 1 ? 2 : 0 })
  } catch {
    return n.toLocaleString()
  }
}

/** A deal's price line: its own label first, else amount (+ unit). */
export function dealPrice(deal, currency) {
  if (deal?.price_label) return String(deal.price_label)
  const amount = money(deal?.deal_price, deal?.currency || currency)
  if (!amount) return ''
  return deal?.price_unit ? `${amount} / ${deal.price_unit}` : amount
}

/** "in 3 h", "today", "Tue 6 Oct" for an expiry or date; '' when unknown. */
export function whenText(iso, now = new Date()) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const ms = d - now
  if (ms > 0 && ms < 3600000) return `in ${Math.max(1, Math.round(ms / 60000))} min`
  if (ms > 0 && ms < 86400000) return `in ${Math.round(ms / 3600000)} h`
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Is a results page past its expiry? */
export function isExpired(expiresAt, now = new Date()) {
  if (!expiresAt) return false
  const d = new Date(expiresAt)
  return !Number.isNaN(d.getTime()) && d <= now
}

/** Areas present in a list of businesses, from their own city values, most first. */
export function areaFacets(list) {
  const counts = new Map()
  for (const b of list) {
    const c = String(b.city || '').trim()
    if (c) counts.set(c, (counts.get(c) || 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
}
