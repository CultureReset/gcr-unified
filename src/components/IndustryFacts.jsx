// Renders business.industry_facts — the row from the entity's direct
// industry table (industry_charter_fishing, industry_condo, …) that the API
// resolves through industry_table_contract. Generic on purpose: any column
// added to an industry table shows up here with no frontend change.

const HIDDEN_KEYS = new Set(['entity_slug', 'id', 'updated_at', 'created_at', 'parent_managed_by'])

// Pairs collapsed into a single range fact
const RANGE_PAIRS = [
  { low: 'price_low', high: 'price_high', label: 'Price range', prefix: '$' },
  { low: 'nightly_low', high: 'nightly_high', label: 'Nightly rate', prefix: '$' },
  { low: 'bedrooms_min', high: 'bedrooms_max', label: 'Bedrooms' },
  { low: 'sleeps_min', high: 'sleeps_max', label: 'Sleeps' },
  { low: 'passenger_min', high: 'passenger_max', label: 'Passengers' },
  { low: 'shortest_trip_hours', high: 'longest_trip_hours', label: 'Trip length', suffix: ' hrs' },
]

const LABELS = {
  boat_name: 'Boat', boat_model: 'Boat model', boat_length_ft: 'Boat length',
  trip_count: 'Trip options', booking_platform: 'Books through',
  total_units: 'Units', floors: 'Floors', year_built: 'Built', listed_unit_count: 'Listed units',
  unit_count: 'Units', bathrooms: 'Bathrooms', sqft: 'Square feet', cleaning_fee: 'Cleaning fee',
  min_stay_nights: 'Minimum stay', check_in_time: 'Check-in', check_out_time: 'Check-out',
  total_slips: 'Boat slips', transient_slips: 'Transient slips', max_vessel_length_ft: 'Max vessel length',
  vhf_channel: 'VHF channel', daily_rate_per_ft: 'Daily rate / ft', transient_rate_per_ft: 'Transient rate / ft',
  shore_power_amps: 'Shore power', resident_charter_count: 'Charters on site',
  menu_section_count: 'Menu sections', menu_item_count: 'Menu items',
  price_range: 'Price range', price_level: 'Price level',
  cover_charge: 'Cover charge', age_restriction: 'Age restriction',
  bar_type: 'Type', cafe_type: 'Type',
  hh_days: 'Happy hour days', hh_start: 'Happy hour starts', hh_end: 'Happy hour ends',
}

const UNIT_SUFFIX = [
  [/_ft$/, ' ft'],
  [/_hours$/, ' hrs'],
  [/_minutes$/, ' min'],
]

function humanize(key) {
  if (LABELS[key]) return LABELS[key]
  let k = key.replace(/^(has_|serves_|offers_|is_)/, '').replace(/_/g, ' ')
  return k.charAt(0).toUpperCase() + k.slice(1)
}

function factValue(key, value) {
  if (typeof value === 'number') {
    for (const [re, suffix] of UNIT_SUFFIX) if (re.test(key)) return `${value}${suffix}`
    if (/fee|rate|price/.test(key)) return `$${value}`
    return String(value)
  }
  return String(value)
}

export default function IndustryFacts({ facts }) {
  if (!facts) return null

  const chips = []
  const rows = []
  const used = new Set(HIDDEN_KEYS)

  // Collapse min/max pairs into ranges first
  for (const p of RANGE_PAIRS) {
    const lo = facts[p.low]; const hi = facts[p.high]
    if (lo == null && hi == null) continue
    used.add(p.low); used.add(p.high)
    const fmt = v => `${p.prefix || ''}${v}`
    let text
    if (lo != null && hi != null && lo !== hi) text = `${fmt(lo)}–${fmt(hi)}${p.suffix || ''}`
    else text = `${fmt(lo ?? hi)}${p.suffix || ''}`
    rows.push({ label: p.label, value: text })
  }

  for (const [key, value] of Object.entries(facts)) {
    if (used.has(key) || value == null || value === '') continue
    if (typeof value === 'boolean') {
      if (value) chips.push(humanize(key))
      continue
    }
    rows.push({ label: humanize(key), value: factValue(key, value) })
  }

  if (!chips.length && !rows.length) return null

  return (
    <div style={{ marginTop: 16 }}>
      <h3>At a Glance</h3>
      {rows.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px 16px', fontSize: 14 }}>
          {rows.map((r, i) => (
            <div key={i}>
              <span style={{ opacity: .65 }}>{r.label}: </span>
              <strong>{r.value}</strong>
            </div>
          ))}
        </div>
      )}
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: rows.length ? 10 : 0 }}>
          {chips.map((c, i) => (
            <span key={i} style={{ fontSize: 13, padding: '4px 12px', borderRadius: 999, background: 'rgba(13,125,116,.1)' }}>
              ✓ {c}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
