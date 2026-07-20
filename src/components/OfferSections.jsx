import { useState } from 'react'
import './OfferSections.css'

// Renders the L2 offer model (entity_offer / _price / _section / _inclusion)
// returned by the API as offer_sections / offers_unsectioned. Reusable across
// tabs — filterType scopes which offer_type values show in a given tab.
const TYPE_ALIASES = {
  menu: ['menu'],
  drinks: ['drink', 'drinks'],
  happy_hour: ['happy_hour'],
}
// Types that already have their own dedicated tabs — excluded from the
// catch-all (no filterType) rendering used by offerings/charters/stays.
const OWN_TAB_TYPES = new Set(['menu', 'drink', 'drinks', 'happy_hour'])

function matchesType(offer, filterType) {
  if (!filterType) return !OWN_TAB_TYPES.has(offer.offer_type)
  const aliases = TYPE_ALIASES[filterType] || [filterType]
  return aliases.includes(offer.offer_type)
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatTime(t) {
  if (!t) return ''
  const [h, m] = String(t).split(':').map(Number)
  if (Number.isNaN(h)) return t
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${hour12}:${String(m).padStart(2, '0')} ${period}` : `${hour12} ${period}`
}

function priceLabel(p) {
  const parts = [p.label || p.party_role || 'Price']
  if (p.age_min != null || p.age_max != null) {
    if (p.age_min != null && p.age_max != null) parts.push(`(${p.age_min}-${p.age_max})`)
    else if (p.age_min != null) parts.push(`(${p.age_min}+)`)
    else parts.push(`(up to ${p.age_max})`)
  }
  return parts.join(' ')
}

function priceWindow(p) {
  const bits = []
  if (p.day_of_week != null && DAY_LABELS[p.day_of_week]) bits.push(DAY_LABELS[p.day_of_week])
  if (p.time_start || p.time_end) {
    bits.push(`${formatTime(p.time_start)}${p.time_end ? `–${formatTime(p.time_end)}` : ''}`)
  }
  return bits.join(' · ')
}

function PriceRow({ p }) {
  const window = priceWindow(p)
  return (
    <div className={`offer-price${p.is_promotional ? ' offer-price--promo' : ''}`}>
      <span className="offer-price__label">{priceLabel(p)}</span>
      {p.price_status === 'market_price' ? (
        <span className="offer-price__market">Market price</span>
      ) : p.amount != null ? (
        <span className="offer-price__amount">
          ${Number(p.amount).toFixed(2).replace(/\.00$/, '')}
          {p.price_unit ? ` / ${p.price_unit}` : ''}
        </span>
      ) : null}
      {window && <span className="offer-price__window">{window}</span>}
      {p.is_promotional && <span className="offer-price__badge">Deal</span>}
      {p.price_note && <span className="offer-price__note">{p.price_note}</span>}
    </div>
  )
}

function OfferCard({ offer }) {
  const [expanded, setExpanded] = useState(false)
  const prices = offer.prices || []
  const hasDetail = offer.included.length > 0 || offer.bring.length > 0

  return (
    <div className="offer-card">
      {offer.image_url && (
        <img className="offer-card__img" src={offer.image_url} alt={offer.name} loading="lazy" />
      )}
      <div className="offer-card__body">
        <div className="offer-card__head">
          <h4 className="offer-card__name">{offer.name}</h4>
          {offer.badge && <span className="offer-card__badge">{offer.badge}</span>}
        </div>

        {offer.description && <p className="offer-card__desc">{offer.description}</p>}

        {(offer.duration_minutes || offer.party_min || offer.party_max || offer.capacity) && (
          <div className="offer-card__meta">
            {offer.duration_minutes && (
              <span>
                ⏱ {offer.duration_minutes}
                {offer.duration_minutes_max && offer.duration_minutes_max !== offer.duration_minutes
                  ? `–${offer.duration_minutes_max}` : ''} min
              </span>
            )}
            {(offer.party_min || offer.party_max) && (
              <span>👥 {offer.party_min || 1}{offer.party_max ? `–${offer.party_max}` : '+'} people</span>
            )}
            {offer.capacity && <span>🪑 Capacity {offer.capacity}</span>}
          </div>
        )}

        {prices.length > 0 && (
          <div className={`offer-card__prices${prices.length > 1 ? ' offer-card__prices--multi' : ''}`}>
            {prices.map(p => <PriceRow key={p.price_id} p={p} />)}
          </div>
        )}

        {hasDetail && (
          <>
            <button type="button" className="offer-card__toggle" onClick={() => setExpanded(e => !e)}>
              {expanded ? 'Hide details' : 'Details'}
            </button>
            {expanded && (
              <div className="offer-card__detail">
                {offer.included.length > 0 && (
                  <div>
                    <h5>Included</h5>
                    <ul>{offer.included.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  </div>
                )}
                {offer.bring.length > 0 && (
                  <div>
                    <h5>What to bring</h5>
                    <ul>{offer.bring.map((item, i) => <li key={i}>{item}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {offer.booking_url && (
          <a className="offer-card__book" href={offer.booking_url} target="_blank" rel="noopener noreferrer">
            Book
          </a>
        )}
      </div>
    </div>
  )
}

/**
 * @param {Array} sections - offer_sections from the API (each with an `offers` array)
 * @param {Array} [unsectioned] - offers_unsectioned from the API
 * @param {string} [filterType] - 'menu' | 'drinks' | 'happy_hour' | undefined
 *   (undefined shows everything that isn't menu/drinks/happy_hour — the
 *   offerings/charters/stays catch-all)
 */
export default function OfferSections({ sections, unsectioned, filterType }) {
  const filteredSections = (sections || [])
    .map(sec => ({ ...sec, offers: (sec.offers || []).filter(o => matchesType(o, filterType)) }))
    .filter(sec => sec.offers.length > 0)

  const filteredUnsectioned = (unsectioned || []).filter(o => matchesType(o, filterType))

  if (!filteredSections.length && !filteredUnsectioned.length) return null

  return (
    <div className="offer-sections">
      {filteredSections.map(sec => (
        <div key={sec.section_id} className="offer-section">
          <h3 className="offer-section__title">{sec.name}</h3>
          {sec.description && <p className="offer-section__desc">{sec.description}</p>}
          <div className="offer-section__grid">
            {sec.offers.map(o => <OfferCard key={o.offer_id} offer={o} />)}
          </div>
        </div>
      ))}
      {filteredUnsectioned.length > 0 && (
        <div className="offer-section">
          <div className="offer-section__grid">
            {filteredUnsectioned.map(o => <OfferCard key={o.offer_id} offer={o} />)}
          </div>
        </div>
      )}
    </div>
  )
}
