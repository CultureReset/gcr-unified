// Hours / status / distance helpers.
//
// These used to live inside GCRCard.jsx. The mini card and the section
// grouping both need "is this place open right now", and three copies of the
// same day-of-week + open/close parsing would drift the moment one of them
// gained a new column fallback (opens_at vs open_time vs open). One copy.

export function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m ? `${h12}:${String(m).padStart(2,'0')}${ap}` : `${h12}${ap}`
}

export function getTodayHours(hours) {
  if (!hours || !hours.length) return null
  const todayIdx = new Date().getDay() // 0=Sun, 1=Mon...
  const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const todayName = DAYS[todayIdx]
  return hours.find(h => {
    // day_of_week can be a number (0-6) or a string ("monday")
    if (typeof h.day_of_week === 'number') return h.day_of_week === todayIdx
    const s = String(h.day_of_week || h.day || '').toLowerCase()
    return s === todayName || s === String(todayIdx)
  }) || null
}

export function computeStatus(hours) {
  if (!hours || !hours.length) return null
  const h = getTodayHours(hours)
  if (!h) return null
  if (h.is_closed) return { label: 'Closed Today', cls: 'closed' }

  const openStr  = h.open_time  || h.opens_at  || h.open  || ''
  const closeStr = h.close_time || h.closes_at || h.close || ''
  if (!openStr || !closeStr) return null

  const cur = new Date().getHours() * 60 + new Date().getMinutes()
  const [oh, om] = openStr.split(':').map(Number)
  const [ch, cm] = closeStr.split(':').map(Number)
  const openMin  = oh * 60 + om
  const closeMin = ch * 60 + cm

  if (cur < openMin - 60) return null
  if (cur < openMin)       return { label: `Opens ${fmt12(openStr)}`,           cls: 'opening' }
  if (cur < closeMin - 30) return { label: `Open · Closes ${fmt12(closeStr)}`,  cls: 'open'    }
  if (cur < closeMin)      return { label: `Closing Soon · ${fmt12(closeStr)}`, cls: 'closing' }
  return { label: 'Closed', cls: 'closed' }
}

export function computeHoursLine(hours) {
  const h = getTodayHours(hours)
  if (!h) return ''
  if (h.is_closed) return 'Closed Today'
  const o = h.open_time  || h.opens_at  || h.open  || ''
  const c = h.close_time || h.closes_at || h.close || ''
  if (!o || !c) return ''
  return `${fmt12(o)} – ${fmt12(c)}`
}

export function fmtDist(miles) {
  if (miles == null) return null
  if (miles < 0.1) return 'Here'
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles)} mi`
}

// Short form for the mini card, where "Open · Closes 9pm" is too long to fit
// next to a name. Same underlying status, fewer words.
export function shortStatus(hours) {
  const s = computeStatus(hours)
  if (!s) return null
  const SHORT = {
    open:    'Open',
    opening: 'Opens soon',
    closing: 'Closing soon',
    closed:  'Closed',
  }
  return { label: SHORT[s.cls] || s.label, cls: s.cls }
}
