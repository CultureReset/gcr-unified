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

function priceRowLabel(p) {
  const parts = []
  if (p.label) parts.push(p.label)
  else if (p.party_role) parts.push(p.party_role)
  if (p.age_min != null || p.age_max != null) {
    if (p.age_min != null && p.age_max != null) parts.push(`${p.age_min}-${p.age_max} yrs`)
    else if (p.age_min != null) parts.push(`${p.age_min}+ yrs`)
    else parts.push(`up to ${p.age_max} yrs`)
  }
  if (p.day_of_week != null && DAY_LABELS[p.day_of_week]) parts.push(DAY_LABELS[p.day_of_week])
  if (p.time_start || p.time_end) {
    parts.push(`${formatTime(p.time_start)}${p.time_end ? `–${formatTime(p.time_end)}` : ''}`)
  }
  return parts.length ? parts.join(' · ') : 'Price'
}

function PriceRow({ p }) {
  if (p.price_status === 'market_price') {
    return (
      <div className="offer-price-row">
        <span className="offer-price-label">{priceRowLabel(p)}</span>
        <span className="offer-price-amount offer-price-market">Market price</span>
      </div>
    )
  }
  if (p.amount == null) return null
  return (
    <div className="offer-price-row">
      <span className="offer-price-label">{priceRowLabel(p)}</span>
      <span className="offer-price-amount">
        ${Number(p.amount).toFixed(2).replace(/\.00$/, '')}
        {p.price_unit && <span className="offer-price-unit"> / {p.price_unit}</span>}
        {p.is_promotional && <span className="offer-badge offer-badge-promo">Deal</span>}
      </span>
    </div>
  )
}

function OfferCard({ offer }) {
  const prices = offer.prices || []
  const showPriceList = prices.length > 1
  const singlePrice = prices.length === 1 ? prices[0] : null

  return (
    <div className="offer-card">
      {offer.image_url && (
        <div className="offer-card-image">
          <img src={offer.image_url} alt={offer.name} loading="lazy" />
        </div>
      )}
      <div className="offer-card-body">
        <div className="offer-card-head">
          <span className="offer-card-name">{offer.name}</span>
          {!showPriceList && (
            <span className="offer-card-price">
              {offer.is_market_price && offer.price_from == null ? (
                <span className="offer-price-market">Market price</span>
              ) : offer.price_from != null ? (
                <>
                  {offer.price_from === offer.price_to
                    ? `$${offer.price_from}`
                    : `$${offer.price_from}–$${offer.price_to}`}
                  {offer.price_unit && <span className="offer-price-unit"> / {offer.price_unit}</span>}
                </>
              ) : null}
            </span>
          )}
        </div>

        {offer.badge && <span className="offer-badge offer-badge-flag">{offer.badge}</span>}
        {!offer.badge && offer.has_promotional && <span className="offer-badge offer-badge-promo">Deal</span>}

        {offer.description && <p className="offer-card-desc">{offer.description}</p>}

        {(offer.duration_minutes || offer.party_min || offer.capacity) && (
          <div className="offer-card-meta">
            {offer.duration_minutes && (
              <span>
                ⏱ {offer.duration_minutes}
                {offer.duration_minutes_max && offer.duration_minutes_max !== offer.duration_minutes
                  ? `–${offer.duration_minutes_max}` : ''} min
              </span>
            )}
            {(offer.party_min || offer.party_max) && (
              <span>
                👥 {offer.party_min || 1}{offer.party_max ? `–${offer.party_max}` : '+'} people
              </span>
            )}
            {offer.capacity && <span>🪑 Capacity {offer.capacity}</span>}
          </div>
        )}

        {showPriceList && (
          <div className="offer-price-list">
            {prices.map(p => <PriceRow key={p.price_id} p={p} />)}
          </div>
        )}
        {singlePrice && singlePrice.price_note && (
          <p className="offer-price-note">{singlePrice.price_note}</p>
        )}

        {offer.included.length > 0 && (
          <div className="offer-chips">
            {offer.included.map((item, i) => (
              <span key={i} className="offer-chip offer-chip-included">✓ {item}</span>
            ))}
          </div>
        )}
        {offer.bring.length > 0 && (
          <div className="offer-chips">
            {offer.bring.map((item, i) => (
              <span key={i} className="offer-chip offer-chip-bring">🎒 {item}</span>
            ))}
          </div>
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
          <div className="offer-section-head">
            <h3>{sec.name}</h3>
          </div>
          {sec.description && <p className="offer-section-desc">{sec.description}</p>}
          <div className="offer-grid">
            {sec.offers.map(o => <OfferCard key={o.offer_id} offer={o} />)}
          </div>
        </div>
      ))}
      {filteredUnsectioned.length > 0 && (
        <div className="offer-section offer-section-unsectioned">
          <div className="offer-grid">
            {filteredUnsectioned.map(o => <OfferCard key={o.offer_id} offer={o} />)}
          </div>
        </div>
      )}
    </div>
  )
}
