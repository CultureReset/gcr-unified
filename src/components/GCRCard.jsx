import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './GCRCard.css'

// ── Tag category mapping (from launching-GCR buildCard) ──────────────────────
const TAG_CAT = {
  // food
  seafood:'food', fresh_seafood:'food', raw_bar:'food', fish_tacos:'food', burgers:'food',
  pizza:'food', sushi:'food', sandwiches:'food', wings:'food', steaks:'food', bbq:'food',
  southern:'food', american:'food', cajun_creole:'food', mexican:'food', italian:'food',
  breakfast:'food', brunch:'food', lunch:'food', dinner:'food', dessert:'food',
  bakery:'food', ice_cream:'food', snacks:'food', vegan:'food', vegetarian:'food',
  gluten_free:'food', kids_menu:'food', buffet:'food', happy_hour_food:'food',
  catch_of_the_day:'food', gulf_catch:'food', daily_specials:'food',
  // drink
  beer:'drink', wine:'drink', cocktails:'drink', spirits:'drink', mocktails:'drink',
  coffee:'drink', espresso:'drink', smoothies:'drink', juice:'drink', tea:'drink',
  full_bar:'drink', craft_beer:'drink', local_beer:'drink', draft_beer:'drink',
  tiki_cocktails:'drink', frozen_drinks:'drink', signature_cocktails:'drink', open_bar:'drink',
  // vibe
  waterfront:'vibe', outdoor_seating:'vibe', patio:'vibe', rooftop:'vibe',
  live_music:'vibe', live_dj:'vibe', karaoke:'vibe', trivia:'vibe', sports_tv:'vibe',
  beach_access:'vibe', scenic_views:'vibe', sunset_views:'vibe', sunset_view:'vibe',
  marina_view:'vibe', ocean_view:'vibe', bay_view:'vibe', gulf_view:'vibe',
  pet_friendly:'vibe', romantic:'vibe', family_friendly:'vibe', group_friendly:'vibe',
  lively:'vibe', casual:'vibe', upscale:'vibe', dive_bar:'vibe', sports_bar:'vibe',
  tiki_bar:'vibe', rooftop_bar:'vibe', beachfront:'vibe', dockside:'vibe',
  // service
  delivery:'service', takeout:'service', dine_in:'service', curbside:'service',
  reservations:'service', private_events:'service', catering:'service',
  wheelchair_accessible:'service', good_for_children:'service', parking:'service',
  boat_slips:'service', valet:'service', live_entertainment:'service',
}

const TAG_EMOJI = {
  seafood:'🦐', fresh_seafood:'🦐', raw_bar:'🦪', fish_tacos:'🌮', burgers:'🍔',
  pizza:'🍕', sushi:'🍣', wings:'🍗', steaks:'🥩', bbq:'🔥', breakfast:'🍳',
  brunch:'🥞', dessert:'🍰', ice_cream:'🍦', vegan:'🥗', gluten_free:'✓',
  happy_hour_food:'🏷️', catch_of_the_day:'🐟',
  beer:'🍺', wine:'🍷', cocktails:'🍸', coffee:'☕', full_bar:'🍹',
  tiki_cocktails:'🌺', frozen_drinks:'🧃', craft_beer:'🍺',
  waterfront:'🌊', beachfront:'🏖️', dockside:'⚓', outdoor_seating:'🌿',
  patio:'🌿', rooftop:'🌆', live_music:'🎸', live_dj:'🎧',
  karaoke:'🎤', trivia:'🧠', sports_tv:'📺', pet_friendly:'🐾',
  romantic:'❤️', family_friendly:'👨‍👩‍👧', marina_view:'⛵', sunset_view:'🌅',
  sunset_views:'🌅', ocean_view:'🌊', bay_view:'🌅', gulf_view:'🌊',
  delivery:'🛵', takeout:'🥡', dine_in:'🍽️',
  wheelchair_accessible:'♿', good_for_children:'👶', parking:'🅿️', boat_slips:'⛵',
}

const ACTIVITY_SUBTYPES = new Set([
  'parasailing','boat-rentals','boat_rental','boat_rentals','charter-fishing','fishing_charter',
  'dolphin-cruises-tours','dolphin_cruise','dolphin_cruises_tours','jet-ski-rentals-tours',
  'jet_ski','jet_ski_rentals_tours','canoe-kayak-paddleboard-rentals','canoe_kayak_paddleboard',
  'banana-boat-rides','banana_boat','helicopter-airplane-tours','sunset-cruises-tours',
  'boat-tours','boat_tours','watersports','snorkeling','paddleboard','kayak_rental','fishing-charters',
  'things-to-do','things_to_do','activity',
])

const FOOD_CATEGORIES = new Set(['restaurants','coffee-sweets','coffee','nightlife','happy-hours'])

function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m ? `${h12}:${String(m).padStart(2,'0')}${ap}` : `${h12}${ap}`
}

function getTodayHours(hours) {
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

function computeStatus(hours) {
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

function computeHoursLine(hours) {
  const h = getTodayHours(hours)
  if (!h) return ''
  if (h.is_closed) return 'Closed Today'
  const o = h.open_time  || h.opens_at  || h.open  || ''
  const c = h.close_time || h.closes_at || h.close || ''
  if (!o || !c) return ''
  return `${fmt12(o)} – ${fmt12(c)}`
}

const STATUS_LABELS = { open: 'Open Now', opening: 'Opening Soon', closing: 'Closing Soon', closed: 'Closed' }

export default function GCRCard({ entity, category, onSave, savedSlugs }) {
  const navigate = useNavigate()
  const [showHH, setShowHH] = useState(false)

  if (!entity) return null

  const slug = entity.slug || entity.subdomain || entity.id || ''
  const name = entity.name || 'Business'
  const icon = entity.icon || entity.emoji || '📍'
  const sub = entity.subtitle || ''
  const rawSubtype = (entity.entity_subtype || entity.entity_type || entity.type || '').toLowerCase()
  const subtypeKey = rawSubtype.replace(/-/g, '_')
  const subtype = rawSubtype.replace(/_/g, ' ')
  const city = entity.city || ''
  const state = entity.state || ''
  const location = [city, state].filter(Boolean).join(', ')
  const addr = entity.address_line_1 || entity.address || ''
  const fullAddr = [addr, city, state].filter(Boolean).join(', ')

  // Find best photo: prefer cover photo, then first photo, then hero/cover fields
  const coverPhoto = entity.photos?.find(p => p.is_cover) || entity.photos?.[0]
  const hero = entity.hero_image_url || entity.cover_url ||
    coverPhoto?.url || coverPhoto?.image_url ||
    `https://images.unsplash.com/photo-1504674900968-08049c043914?w=600&q=80`

  const phone = entity.phone || ''
  const dir = entity.directions_url || ''
  const bookingUrl = entity.booking_url || ''
  const reservationUrl = entity.reservation_url || ''
  const orderUrl = entity.order_url || ''
  const menuUrl = entity.menu_url || ''
  const websiteUrl = entity.website_url || ''
  const desc = entity.description || ''
  const rating = entity.rating
  const reviews = entity.review_count || 0

  const hhDays = entity.hh_days || ''
  const hhStart = entity.hh_start || ''
  const hhEnd = entity.hh_end || ''
  const hhDesc = entity.hh_description || ''

  const isActivity = ACTIVITY_SUBTYPES.has(rawSubtype) || ACTIVITY_SUBTYPES.has(subtypeKey)
  const isSaved = savedSlugs?.has(slug)

  // Status badge
  const status = computeStatus(entity.hours || [])

  // Hours line
  const hoursLine = computeHoursLine(entity.hours || [])

  // Tags
  const rawTags = (entity.tags || [])
    .map(t => (typeof t === 'string' ? t : (t.tag_name || t.tag || '')).trim().toLowerCase().replace(/[\s\-\/]+/g, '_').replace(/[^a-z0-9_]/g, ''))
    .filter(Boolean)
  const allTagKeys = subtypeKey && !rawTags.includes(subtypeKey) ? [subtypeKey, ...rawTags] : rawTags

  // Tag sections
  const sections = { food: [], drink: [], vibe: [], service: [] }
  allTagKeys.forEach(tag => {
    const cat = TAG_CAT[tag]
    if (cat && sections[cat] && sections[cat].length < 8) {
      const emoji = TAG_EMOJI[tag] || ''
      const label = tag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      sections[cat].push({ emoji, label, cat })
    }
  })
  if (entity.waterfront && !sections.vibe.some(c => c.label === 'Waterfront')) sections.vibe.push({ emoji: '🌊', label: 'Waterfront', cat: 'vibe' })
  if (entity.live_music && !sections.vibe.some(c => c.label === 'Live Music')) sections.vibe.push({ emoji: '🎸', label: 'Live Music', cat: 'vibe' })
  if (entity.outdoor_seating && !sections.vibe.some(c => c.label === 'Outdoor Seating')) sections.vibe.push({ emoji: '🌿', label: 'Outdoor Seating', cat: 'vibe' })
  if (entity.delivery && !sections.service.some(c => c.label === 'Delivery')) sections.service.push({ emoji: '🛵', label: 'Delivery', cat: 'service' })
  if (entity.takeout && !sections.service.some(c => c.label === 'Takeout')) sections.service.push({ emoji: '🥡', label: 'Takeout', cat: 'service' })
  if (entity.dine_in && !sections.service.some(c => c.label === 'Dine-in')) sections.service.push({ emoji: '🍽️', label: 'Dine-in', cat: 'service' })
  if (entity.wheelchair_accessible && !sections.service.some(c => c.label === 'Accessible')) sections.service.push({ emoji: '♿', label: 'Accessible', cat: 'service' })
  if (entity.good_for_children && !sections.service.some(c => c.label === 'Kid Friendly')) sections.service.push({ emoji: '👶', label: 'Kid Friendly', cat: 'service' })

  const SECTION_LABELS = { food: 'Food', drink: 'Drinks', vibe: 'Vibe & Amenities', service: 'Service' }
  const hasAnySections = Object.values(sections).some(a => a.length > 0)

  // Live music detection
  const hasLiveMusic = rawTags.some(t => t.includes('live_music') || t.includes('live music')) || entity.live_music

  // Image badges
  const imgBadges = [
    hasLiveMusic ? '🎸 Live Music' : null,
    (entity.waterfront || rawTags.includes('waterfront')) ? '🌊 Waterfront' : null,
    (entity.outdoor_seating || rawTags.includes('outdoor_seating')) ? '🌿 Outdoor' : null,
  ].filter(Boolean)

  // Price
  const pFrom = entity.price_from
  const pUnit = entity.price_unit || ''
  const priceRange = entity.price_range || ''

  // Profile URL
  const profileUrl = `/business/${slug}`
  const isFoodPage = FOOD_CATEGORIES.has(category)

  // Dedupe action URLs
  const usedUrls = new Set()
  const dedupeUrl = (url) => {
    if (!url) return null
    const key = url.replace(/https?:\/\//, '').replace(/\/$/, '').split('?')[0]
    if (usedUrls.has(key)) return null
    usedUrls.add(key)
    return url
  }

  const dedupedBook = dedupeUrl(bookingUrl)
  const dedupedReserve = dedupeUrl(reservationUrl)
  const dedupedOrder = dedupeUrl(orderUrl)
  const dedupedDir = dedupeUrl(dir)

  return (
    <div className="gcr-card" onClick={() => navigate(profileUrl)}>
      {/* Image */}
      <div className="gcr-card-img" style={{ backgroundImage: `url(${hero})` }}>
        <div className="gcr-card-badge">{icon} {subtype}</div>

        {status && (
          <div className={`gcr-badge-status status-${status.cls}`}>
            {status.label}
          </div>
        )}

        <button
          className={`gcr-save-btn ${isSaved ? 'saved' : ''}`}
          onClick={e => { e.stopPropagation(); onSave?.(entity) }}
        >
          {isSaved ? '❤️' : '🤍'}
        </button>

        {imgBadges.length > 0 && (
          <div className="gcr-img-badges">
            {imgBadges.map((b, i) => (
              <span key={i} className="img-badge">{b}</span>
            ))}
          </div>
        )}

        {priceRange && <div className="gcr-badge-price">{priceRange}</div>}
      </div>

      {/* Body */}
      <div className="gcr-card-body">
        <div className="gcr-card-name">{name}</div>
        {(sub || location) && (
          <div className="gcr-card-sub">{[sub, location].filter(Boolean).join(' · ')}</div>
        )}

        {desc && <div className="gcr-card-desc">{desc}</div>}

        {rating && (
          <div className="gcr-card-rating">
            ⭐ {Number(rating).toFixed(1)}
            {reviews > 0 && <span className="review-count">({reviews})</span>}
          </div>
        )}

        {/* Tag Sections */}
        {hasAnySections ? (
          <div className="gcr-tag-sections">
            {Object.entries(sections).filter(([, chips]) => chips.length > 0).map(([cat, chips]) => (
              <div key={cat} className="gcr-tag-row">
                <div className="gcr-tag-row-label">{SECTION_LABELS[cat]}</div>
                <div className="gcr-tag-scroll">
                  {chips.map((chip, i) => (
                    <span key={i} className={`gcr-chip ${cat}`}>
                      {chip.emoji ? `${chip.emoji} ` : ''}{chip.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : allTagKeys.length > 0 ? (
          <div className="gcr-tag-sections">
            <div className="gcr-tag-row">
              <div className="gcr-tag-scroll">
                {allTagKeys.slice(0, 6).map((t, i) => (
                  <span key={i} className="gcr-chip">
                    {t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {/* Activity Info */}
        {isActivity && (
          <div className="gcr-activity-info">
            {entity.duration_text && <div className="activity-row">⏱ {entity.duration_text}</div>}
            {entity.capacity_max && <div className="activity-row">👥 Up to {entity.capacity_max} people</div>}
            {pFrom != null && (
              <div className="activity-price">
                {pFrom === 0 || pFrom === '0' ? '✓ Free' : `From $${pFrom}${pUnit ? `/${pUnit}` : ''}`}
              </div>
            )}
          </div>
        )}

        {/* Price for non-activity */}
        {!isActivity && pFrom != null && (
          <div className="gcr-price-info">
            💵 {pFrom === 0 || pFrom === '0' ? 'Free' : `From $${pFrom}${pUnit ? `/${pUnit}` : ''}`}
          </div>
        )}
      </div>

      {/* Info Rows */}
      {!isActivity && (hoursLine || hhDays || hasLiveMusic) && (
        <div className="gcr-info-rows">
          {hoursLine && <div className="gcr-info-row gcr-hours">🕐 {hoursLine}</div>}
          {hhDays && (
            <div className="gcr-info-row gcr-hh">
              🍺 Happy Hour {hhDays}{hhStart ? ` · ${fmt12(hhStart)}` : ''}{hhEnd ? `–${fmt12(hhEnd)}` : ''}
            </div>
          )}
          {hasLiveMusic && <div className="gcr-info-row gcr-music">🎸 Live Music</div>}
        </div>
      )}

      {/* Bottom */}
      <div className="gcr-card-bottom">
        {(fullAddr || location) && (
          <div className="gcr-card-addr">📍 {fullAddr || location}</div>
        )}
        <div className="gcr-card-actions" onClick={e => e.stopPropagation()}>
          {isActivity ? (
            <>
              {dedupedBook
                ? <a href={dedupedBook} target="_blank" rel="noopener" className="gcr-btn primary">📅 Book Now</a>
                : <a href={profileUrl} className="gcr-btn primary" onClick={e => { e.preventDefault(); navigate(profileUrl) }}>View Profile</a>
              }
              {dedupedDir && <a href={dedupedDir} target="_blank" rel="noopener" className="gcr-btn">📍 Directions</a>}
              {phone && <a href={`tel:${phone.replace(/\D/g,'')}`} className="gcr-btn">📞 Call</a>}
            </>
          ) : (
            <>
              <a href={profileUrl} className="gcr-btn primary" onClick={e => { e.preventDefault(); navigate(profileUrl) }}>View Profile</a>
              {isFoodPage && (
                menuUrl
                  ? <a href={menuUrl} target="_blank" rel="noopener" className="gcr-btn">🍽️ Menu</a>
                  : <a href={profileUrl} className="gcr-btn" onClick={e => { e.preventDefault(); navigate(profileUrl) }}>🍽️ Menu</a>
              )}
              {(hhDays || entity.hh_sections?.length > 0) && (
                <button className="gcr-btn hh" onClick={e => { e.stopPropagation(); setShowHH(!showHH) }}>
                  🍺 Happy Hour
                </button>
              )}
              {dedupedBook && <a href={dedupedBook} target="_blank" rel="noopener" className="gcr-btn">📅 Book</a>}
              {dedupedReserve && <a href={dedupedReserve} target="_blank" rel="noopener" className="gcr-btn">🍽️ Reserve</a>}
              {dedupedOrder && <a href={dedupedOrder} target="_blank" rel="noopener" className="gcr-btn">🛵 Order</a>}
              {dedupedDir && <a href={dedupedDir} target="_blank" rel="noopener" className="gcr-btn">📍 Directions</a>}
              {phone && <a href={`tel:${phone.replace(/\D/g,'')}`} className="gcr-btn">📞 Call</a>}
            </>
          )}
        </div>
      </div>

      {/* Happy Hour Panel */}
      {showHH && (hhDays || entity.hh_sections?.length) && (
        <div className="gcr-hh-panel" onClick={e => e.stopPropagation()}>
          <div className="hh-title">🍺 Happy Hour</div>
          {hhDays && <div className="hh-time">{hhDays}{hhStart ? ` · ${fmt12(hhStart)}` : ''}{hhEnd ? ` – ${fmt12(hhEnd)}` : ''}</div>}
          {hhDesc && <div className="hh-desc">{hhDesc}</div>}
          {(() => {
            const sections = (entity.hh_sections || []).concat(entity.happy_hour_sections || [])
            const items = []
            sections.forEach(sec => {
              (sec.items || sec.happy_hour_items || []).forEach(item => {
                items.push({ section: sec.section_name || sec.name || '', ...item })
              })
            })
            if (!items.length) return null
            return (
              <div className="hh-items">
                {items.map((item, i) => {
                  const n = item.item_name || item.name || ''
                  if (!n) return null
                  const rawPrice = item.hh_price ?? item.price
                  const priceStr = item.price_text || (rawPrice != null ? `$${Number(rawPrice).toFixed(2).replace(/\.00$/, '')}` : '')
                  return (
                    <div key={i} className="hh-item">
                      <div className="hh-item-info">
                        <div className="hh-item-name">{n}</div>
                        {item.description && <div className="hh-item-desc">{item.description}</div>}
                      </div>
                      {priceStr && <div className="hh-item-price">{priceStr}</div>}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
