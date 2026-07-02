import './SectionRenderer.css'
import { useNavigate } from 'react-router-dom'

/**
 * SectionRenderer — universal display for entity_sections + entity_section_items.
 *
 * Guarantees:
 * 1. Every stored metadata key renders. Known keys get rich treatment; unknown
 *    keys fall back to labeled rows/chips. Nothing stored is ever invisible.
 * 2. Layout is DB-driven via entity_sections.layout:
 *    grid (default) | list | table | chips | accordion | gallery | stats
 *    If layout is null, it's inferred from section_type.
 * 3. Sections render in sort_order. Zero config on the frontend — inserting a
 *    row is all it takes for any industry, any subtype, any future data shape.
 */

// ── Module → tab metadata (unknown keys are humanized automatically) ─────────
const MODULE_TABS = {
  offerings:      { label: 'Offerings',       icon: '🎟️' },
  services:       { label: 'Services',        icon: '💆' },
  rooms:          { label: 'Rooms',           icon: '🛏️' },
  products:       { label: 'Products',        icon: '🛍️' },
  rentals:        { label: 'Rentals',         icon: '🛥️' },
  classes:        { label: 'Classes',         icon: '📆' },
  packages:       { label: 'Packages',        icon: '🎁' },
  rates:          { label: 'Rates',           icon: '💵' },
  park_info:      { label: 'Park Info',       icon: '🌳' },
  whats_included: { label: "What's Included", icon: '✅' },
  highlights:     { label: 'Highlights',      icon: '✨' },
  best_for:       { label: 'Best For',        icon: '🎯' },
  pricing:        { label: 'Pricing',         icon: '💰' },
  amenities:      { label: 'Amenities',       icon: '✨' },
  policies:       { label: 'Policies',        icon: '📋' },
}

const humanize = (s) =>
  String(s || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()

export function moduleTabMeta(moduleKey) {
  return MODULE_TABS[moduleKey] || { label: humanize(moduleKey || 'More'), icon: '📌' }
}

/** Group sections by module_key for tab building. 'offerings' keeps its legacy tab id. */
export function groupSectionsByModule(sections) {
  const groups = new Map()
  for (const sec of sections || []) {
    const key = sec.module_key || 'offerings'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(sec)
  }
  return [...groups.entries()].map(([moduleKey, secs]) => {
    const meta = moduleTabMeta(moduleKey)
    return {
      moduleKey,
      tabId: moduleKey === 'offerings' ? 'offerings' : `flex-${moduleKey}`,
      label: meta.label,
      icon: meta.icon,
      sections: secs.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }
  })
}

// ── Layout inference when entity_sections.layout is null ─────────────────────
const CHIP_TYPES = ['whats_included', 'best_for', 'highlights', 'amenities', 'facilities', 'rules', 'tags', 'features']
const TABLE_TYPES = ['pricing', 'rates', 'fees', 'schedule']
const ACCORDION_TYPES = ['faq', 'policies', 'details']

function resolveLayout(sec) {
  if (sec.layout) return sec.layout
  const t = (sec.section_type || '').toLowerCase()
  if (CHIP_TYPES.some((k) => t.includes(k))) return 'chips'
  if (TABLE_TYPES.some((k) => t.includes(k))) return 'table'
  if (ACCORDION_TYPES.some((k) => t.includes(k))) return 'accordion'
  const items = sec.items || []
  if (items.length > 0 && items.every((i) => (i.metadata || {}).image_url)) return 'gallery'
  return 'grid'
}

// ── Price helpers ────────────────────────────────────────────────────────────
function priceText(item) {
  if (item.price_from != null) {
    return item.price_to != null ? `$${item.price_from}–$${item.price_to}` : `$${item.price_from}`
  }
  return item.price_label || null
}

// ── Metadata rendering: known keys rich, unknown keys never dropped ──────────
const KNOWN_KEYS = new Set(['includes', 'features', 'ages', 'requires', 'deposit', 'note', 'image_url'])

function MetaValue({ value }) {
  if (value == null) return null
  if (Array.isArray(value)) {
    return (
      <span className="sr-chips-inline">
        {value.map((v, i) => (
          <span key={i} className="sr-chip">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
        ))}
      </span>
    )
  }
  if (typeof value === 'boolean') return <span>{value ? '✓ Yes' : '—'}</span>
  if (typeof value === 'object') {
    return (
      <span className="sr-meta-nested">
        {Object.entries(value).map(([k, v]) => (
          <span key={k}><b>{humanize(k)}:</b> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
        ))}
      </span>
    )
  }
  return <span>{String(value)}</span>
}

function ExtraMeta({ metadata }) {
  const extras = Object.entries(metadata || {}).filter(
    ([k, v]) => !KNOWN_KEYS.has(k) && !k.startsWith('_') && v != null && v !== ''
  )
  if (!extras.length) return null
  return (
    <div className="sr-extra-meta">
      {extras.map(([k, v]) => (
        <div key={k} className="sr-extra-row">
          <span className="sr-extra-label">{humanize(k)}</span>
          <MetaValue value={v} />
        </div>
      ))}
    </div>
  )
}

function KnownMeta({ item }) {
  const m = item.metadata || {}
  const includes = Array.isArray(m.includes) ? m.includes : []
  const features = Array.isArray(m.features) ? m.features : []
  return (
    <>
      {includes.length > 0 && (
        <div className="offering-includes">
          {includes.map((inc, k) => <span key={k} className="offering-chip">✓ {inc}</span>)}
        </div>
      )}
      {features.length > 0 && (
        <div className="offering-includes">
          {features.map((f, k) => <span key={k} className="offering-chip feature">★ {f}</span>)}
        </div>
      )}
      {(m.requires || m.deposit || m.ages || m.note) && (
        <div className="offering-notes">
          {m.ages && <span>👥 {m.ages}</span>}
          {m.requires && <span>📋 {m.requires}</span>}
          {m.deposit && <span>💰 Deposit {m.deposit}</span>}
          {m.note && <span>ℹ️ {m.note}</span>}
        </div>
      )}
      <ExtraMeta metadata={m} />
    </>
  )
}

// ── Item renderers per layout ─────────────────────────────────────────────────
function CardItem({ item }) {
  const m = item.metadata || {}
  const price = priceText(item)
  return (
    <div className="offering-card">
      {m.image_url && <img className="sr-card-img" src={m.image_url} alt={item.item_name} loading="lazy" />}
      <div className="offering-head">
        <span className="offering-icon">{item.icon || '•'}</span>
        <span className="offering-name">{item.item_name}</span>
        <span className="offering-price">{price || 'Ask Us'}</span>
      </div>
      {(item.price_label || item.duration) && (
        <div className="offering-meta">
          {item.price_label && item.price_from != null && <span className="offering-label">{item.price_label}</span>}
          {item.duration && <span className="offering-duration">⏱ {item.duration}</span>}
        </div>
      )}
      {item.description && <p className="offering-desc">{item.description}</p>}
      <KnownMeta item={item} />
    </div>
  )
}

function ListItem({ item }) {
  const price = priceText(item)
  return (
    <div className="sr-list-row">
      <div className="sr-list-main">
        <span className="offering-icon">{item.icon || '•'}</span>
        <div className="sr-list-text">
          <span className="offering-name">{item.item_name}</span>
          {item.description && <p className="offering-desc">{item.description}</p>}
          <KnownMeta item={item} />
        </div>
      </div>
      <div className="sr-list-side">
        {price && <span className="offering-price">{price}</span>}
        {item.duration && <span className="offering-duration">⏱ {item.duration}</span>}
      </div>
    </div>
  )
}

function TableLayout({ items }) {
  return (
    <div className="sr-table-wrap">
      <table className="sr-table">
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="sr-td-name">
                {item.icon && <span className="offering-icon">{item.icon} </span>}
                {item.item_name}
                {item.description && <div className="offering-desc">{item.description}</div>}
                <ExtraMeta metadata={item.metadata} />
              </td>
              <td className="sr-td-duration">{item.duration || ''}</td>
              <td className="sr-td-price">{priceText(item) || 'Ask Us'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChipsLayout({ items }) {
  return (
    <div className="sr-chips">
      {items.map((item) => (
        <span key={item.id} className="sr-chip big" title={item.description || ''}>
          {item.icon ? `${item.icon} ` : '✓ '}{item.item_name}
        </span>
      ))}
    </div>
  )
}

function AccordionLayout({ items }) {
  return (
    <div className="sr-accordion">
      {items.map((item) => (
        <details key={item.id} className="sr-acc-item">
          <summary>{item.icon ? `${item.icon} ` : ''}{item.item_name}</summary>
          {item.description && <p className="offering-desc">{item.description}</p>}
          <KnownMeta item={item} />
        </details>
      ))}
    </div>
  )
}

function GalleryLayout({ items }) {
  return (
    <div className="sr-gallery">
      {items.map((item) => {
        const m = item.metadata || {}
        return (
          <div key={item.id} className="sr-gallery-card">
            {m.image_url && <img src={m.image_url} alt={item.item_name} loading="lazy" />}
            <div className="sr-gallery-body">
              <div className="offering-head">
                <span className="offering-name">{item.item_name}</span>
                {priceText(item) && <span className="offering-price">{priceText(item)}</span>}
              </div>
              {item.description && <p className="offering-desc">{item.description}</p>}
              <KnownMeta item={item} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatsLayout({ items }) {
  return (
    <div className="sr-stats">
      {items.map((item) => (
        <div key={item.id} className="sr-stat">
          <span className="sr-stat-value">{priceText(item) || item.duration || item.icon || '•'}</span>
          <span className="sr-stat-label">{item.item_name}</span>
          {item.description && <span className="sr-stat-desc">{item.description}</span>}
        </div>
      ))}
    </div>
  )
}

// ── One section ───────────────────────────────────────────────────────────────
function Section({ sec }) {
  const layout = resolveLayout(sec)
  const items = (sec.items || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  return (
    <div className="offering-section" data-layout={layout}>
      <h2>{sec.icon ? `${sec.icon} ` : ''}{sec.section_name}</h2>
      {sec.subtitle && <p className="sr-subtitle">{sec.subtitle}</p>}
      {layout === 'table' ? <TableLayout items={items} />
        : layout === 'chips' ? <ChipsLayout items={items} />
        : layout === 'accordion' ? <AccordionLayout items={items} />
        : layout === 'gallery' ? <GalleryLayout items={items} />
        : layout === 'stats' ? <StatsLayout items={items} />
        : layout === 'list' ? <div className="sr-list">{items.map((i) => <ListItem key={i.id} item={i} />)}</div>
        : <div className="offering-grid">{items.map((i) => <CardItem key={i.id} item={i} />)}</div>}
    </div>
  )
}

export default function SectionRenderer({ sections }) {
  const sorted = (sections || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  if (!sorted.length) return <p className="no-data">Nothing here yet</p>
  return <>{sorted.map((sec) => <Section key={sec.id} sec={sec} />)}</>
}

// ── Parent-child hub: child entities grouped by type into linked cards ────────
const CHILD_TYPE_LABELS = {
  activity: 'Charters & Activities',
  restaurant: 'Restaurants & Dining',
  coffee: 'Coffee',
  service: 'Services & Rentals',
  shopping: 'Shops',
  hotel: 'Stays',
  condo: 'Stays',
  'vacation-rental': 'Stays',
  park: 'Spots',
}

export function groupChildrenByType(children) {
  const groups = new Map()
  for (const c of children || []) {
    const label = CHILD_TYPE_LABELS[c.entity_type] || humanize(c.entity_type || 'More')
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(c)
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }))
}

export function HubChildren({ children }) {
  const navigate = useNavigate()
  const groups = groupChildrenByType(children)
  if (!groups.length) return null
  return (
    <div className="sr-hub">
      {groups.map((g) => (
        <div key={g.label} className="sr-hub-group">
          <h3>{g.label}</h3>
          <div className="sr-hub-grid">
            {g.items.map((c) => (
              <button key={c.slug} className="sr-hub-card" onClick={() => navigate(`/business/${c.slug}`)}>
                <img src={c.hero_image_url || 'https://images.unsplash.com/photo-1504674900968-08049c043914?w=400&q=80'} alt={c.name} loading="lazy" />
                <div className="sr-hub-card-body">
                  <div className="sr-hub-card-name">{c.name}</div>
                  <div className="sr-hub-card-sub">
                    {humanize(c.entity_subtype || c.entity_type || '')}
                    {c.price_from != null ? ` · from $${c.price_from}${c.price_unit ? '/' + c.price_unit : ''}` : ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
