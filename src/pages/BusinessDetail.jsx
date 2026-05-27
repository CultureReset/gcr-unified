import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { fetchBusinessBySlug, fetchChildRentals } from '../services/gcrApi'
import SwipeCard from '../components/SwipeCard'
import LocationPicker from '../components/LocationPicker'
import './BusinessDetail.css'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':')
  const hr = parseInt(h, 10)
  const ampm = hr >= 12 ? 'PM' : 'AM'
  const h12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr
  return `${h12}:${m} ${ampm}`
}

// ── Section renderer — handles all types from entity_sections ──────────────
function Section({ sec }) {
  const label = sec.section_label || sec.section_key || ''

  if (sec.section_type === 'rich_text') {
    if (!sec.content?.body_text) return null
    return (
      <div className="detail-section">
        {label && <h3>{label}</h3>}
        <p className="detail-body-text" dangerouslySetInnerHTML={{ __html: sec.content.body_text }} />
      </div>
    )
  }

  if (sec.section_type === 'bullets') {
    const bullets = sec.bullets || []
    if (!bullets.length) return null
    return (
      <div className="detail-section">
        {label && <h3>{label}</h3>}
        <div className="detail-bullets">
          {bullets.map((b, i) => (
            <div key={b.id || i} className="detail-bullet-row">
              <span className="bullet-dot">✦</span>
              <span>{b.bullet_text}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (sec.section_type === 'grouped_items') {
    const groups = sec.groups || []
    const ungrouped = sec.ungrouped_items || []
    if (!groups.length && !ungrouped.length) return null
    return (
      <div className="detail-section">
        {label && <h3>{label}</h3>}
        {groups.map((g, gi) => (
          <div key={g.id || gi} className="detail-group">
            {g.title && <div className="detail-group-title">{g.title}</div>}
            {g.subtitle && <div className="detail-group-sub">{g.subtitle}</div>}
            {(g.items || []).map((item, ii) => (
              <GroupItem key={item.id || ii} item={item} />
            ))}
            {g.note_text && <div className="detail-group-note">{g.note_text}</div>}
          </div>
        ))}
        {ungrouped.map((item, i) => <GroupItem key={item.id || i} item={item} />)}
      </div>
    )
  }

  if (sec.section_type === 'cards') {
    const cards = sec.cards || []
    if (!cards.length) return null
    return (
      <div className="detail-section">
        {label && <h3>{label}</h3>}
        <div className="detail-cards-grid">
          {cards.map((c, i) => (
            <div key={c.id || i} className="detail-card-item">
              {c.image_url && <img src={c.image_url} alt={c.title || ''} className="detail-card-img" onError={e => { e.target.style.display = 'none' }} />}
              <div className="detail-card-body">
                {c.badge_text && <span className="detail-card-badge">{c.badge_text}</span>}
                {c.title && <div className="detail-card-title">{c.title}</div>}
                {c.subtitle && <div className="detail-card-sub">{c.subtitle}</div>}
                {c.price_text && <div className="detail-card-price">{c.price_text}</div>}
                {c.description && <div className="detail-card-desc">{c.description}</div>}
                {c.link_url && (
                  <a href={c.link_url} target="_blank" rel="noopener noreferrer" className="detail-card-link">
                    Learn More →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (sec.section_type === 'gallery') {
    const photos = sec.photos || []
    if (!photos.length) return null
    return (
      <div className="detail-section">
        {label && <h3>{label}</h3>}
        <div className="detail-photo-grid">
          {photos.map((p, i) => (
            <div key={p.id || i} className="detail-photo-cell">
              <img src={p.image_url} alt={p.caption || p.alt_text || ''} onError={e => { e.target.style.display = 'none' }} />
              {p.caption && <div className="detail-photo-cap">{p.caption}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (sec.section_type === 'reviews') {
    const reviews = sec.reviews || []
    if (!reviews.length) return null
    return (
      <div className="detail-section">
        {label && <h3>{label}</h3>}
        <div className="reviews-list">
          {reviews.slice(0, 6).map((rv, i) => (
            <div key={rv.id || i} className="review-card">
              <div className="review-top">
                <div className="review-avatar">{(rv.author_name || 'G')[0].toUpperCase()}</div>
                <div>
                  <div className="review-name">{rv.author_name || 'Guest'}</div>
                  <div className="review-stars">{'⭐'.repeat(Math.min(rv.rating || 5, 5))}</div>
                </div>
                {rv.review_date && <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)' }}>{new Date(rv.review_date).toLocaleDateString()}</div>}
              </div>
              {rv.review_text && <p className="review-text">{rv.review_text}</p>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (sec.section_type === 'hours') {
    const hrs = sec.hours || []
    if (!hrs.length) return null
    const today = new Date().getDay()
    return (
      <div className="detail-section">
        {label && <h3>{label}</h3>}
        <div className="hours-list">
          {hrs.map((row, i) => {
            const isToday = row.day_of_week === today
            return (
              <div key={row.id || i} className={`hours-row ${isToday ? 'hours-today' : ''}`}>
                <span className="hours-day">{DAYS[row.day_of_week]}</span>
                <span className="hours-time">
                  {row.is_closed ? 'Closed' : `${fmt12(row.open_time)} – ${fmt12(row.close_time)}`}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (sec.section_type === 'location') {
    const loc = sec.location
    if (!loc) return null
    const addr = [loc.address_line_1, loc.city, loc.state].filter(Boolean).join(', ')
    return (
      <div className="detail-section">
        {label && <h3>{label}</h3>}
        {addr && <div className="info-item"><span className="info-icon">📍</span><span>{addr}</span></div>}
        {loc.phone && <div className="info-item"><span className="info-icon">📞</span><span>{loc.phone}</span></div>}
        {loc.website_url && (
          <a href={loc.website_url} target="_blank" rel="noopener noreferrer" className="info-item" style={{ color: 'var(--primary)' }}>
            <span className="info-icon">🌐</span><span>{loc.website_url}</span>
          </a>
        )}
      </div>
    )
  }

  return null
}

function GroupItem({ item }) {
  const name = item.item_name || item.name || ''
  const desc = item.item_description || item.description || ''
  const price = item.price_text || (item.price_numeric != null ? `$${item.price_numeric}` : '') ||
    (item.price_min != null && item.price_max != null ? `$${item.price_min}–$${item.price_max}` : '')
  return (
    <div className="detail-group-item">
      <div className="detail-group-item-left">
        <span className="detail-group-item-name">{name}</span>
        {desc && <span className="detail-group-item-desc">{desc}</span>}
      </div>
      {price && <span className="detail-group-item-price">{price}</span>}
    </div>
  )
}

// ── Menu renderer — sections → sub_sections → items ───────────────────────
function MenuBlock({ title, data }) {
  const sections = data?.sections || []
  const subSections = data?.sub_sections || []
  const items = data?.items || []
  if (!sections.length && !items.length) return null

  if (!sections.length) {
    return (
      <div className="detail-section">
        <h3>{title}</h3>
        {items.map((item, i) => (
          <div key={item.id || i} className="detail-group-item">
            <div className="detail-group-item-left">
              <span className="detail-group-item-name">{item.item_name || item.name}</span>
              {item.description && <span className="detail-group-item-desc">{item.description}</span>}
            </div>
            {item.price != null && <span className="detail-group-item-price">${item.price}</span>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="detail-section">
      <h3>{title}</h3>
      {sections.map(sec => {
        const secSubs = subSections.filter(s => s.menu_section_id === sec.id || s.drink_section_id === sec.id)
        const secItems = items.filter(it => it.menu_section_id === sec.id || it.drink_section_id === sec.id)
        return (
          <div key={sec.id} className="detail-menu-section">
            {sec.section_name && <div className="detail-menu-section-name">{sec.section_name}</div>}
            {secSubs.map(sub => {
              const subItems = items.filter(it => it.menu_sub_section_id === sub.id)
              return (
                <div key={sub.id} className="detail-menu-subsection">
                  {sub.sub_section_name && <div className="detail-menu-subsection-name">{sub.sub_section_name}</div>}
                  {subItems.map((item, i) => (
                    <div key={item.id || i} className="detail-group-item">
                      <div className="detail-group-item-left">
                        <span className="detail-group-item-name">{item.item_name || item.name}</span>
                        {item.description && <span className="detail-group-item-desc">{item.description}</span>}
                      </div>
                      {item.price != null && <span className="detail-group-item-price">${item.price}</span>}
                    </div>
                  ))}
                </div>
              )
            })}
            {secItems.map((item, i) => (
              <div key={item.id || i} className="detail-group-item">
                <div className="detail-group-item-left">
                  <span className="detail-group-item-name">{item.item_name || item.name}</span>
                  {item.description && <span className="detail-group-item-desc">{item.description}</span>}
                </div>
                {item.price != null && <span className="detail-group-item-price">${item.price}</span>}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ── Happy Hour block ───────────────────────────────────────────────────────
function HappyHourBlock({ b }) {
  const sections = b.happy_hour?.sections || []
  const items = b.happy_hour?.items || b.happy_hour_items || []
  const hasHH = b.happy_hour_text || b.hh_description || sections.length || items.length
  if (!hasHH) return null

  return (
    <div className="detail-section">
      <h3>🍹 Happy Hour</h3>
      {b.happy_hour_text && <div className="detail-hh-schedule">{b.happy_hour_text}</div>}
      {b.hh_description && <div className="detail-hh-schedule">{b.hh_description}</div>}
      {sections.map(sec => (
        <div key={sec.id}>
          {sec.section_name && <div className="detail-menu-section-name">{sec.section_name}</div>}
        </div>
      ))}
      {items.map((item, i) => (
        <div key={item.id || i} className="detail-hh-row">
          <div>
            <div className="detail-hh-name">{item.item_name || item.label || item.name}</div>
            {item.description && <div className="detail-hh-desc">{item.description}</div>}
          </div>
          {item.price != null && <span className="detail-hh-price">${item.price}</span>}
        </div>
      ))}
    </div>
  )
}

// ── Hours section ──────────────────────────────────────────────────────────
function HoursBlock({ hours }) {
  if (!hours?.length) return null
  const today = new Date().getDay()
  return (
    <div className="detail-section">
      <h3>Hours</h3>
      <div className="hours-list">
        {hours.map(row => {
          const isToday = row.day_of_week === today
          return (
            <div key={row.day_of_week} className={`hours-row ${isToday ? 'hours-today' : ''}`}>
              <span className="hours-day">{DAYS[row.day_of_week]}</span>
              <span className="hours-time">
                {row.is_closed ? 'Closed' : `${fmt12(row.open_time)} – ${fmt12(row.close_time)}`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Photo gallery strip ────────────────────────────────────────────────────
function PhotoGallery({ photos }) {
  if (!photos?.length) return null
  return (
    <div className="detail-section">
      <h3>Photos</h3>
      <div className="photos-scroll">
        {photos.map((url, i) => (
          <img key={i} src={url} alt="" className="photo-thumb"
            onError={e => { e.target.style.display = 'none' }} />
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function BusinessDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addSavedPlace, removeSavedPlace, savedPlaces } = useApp()

  const [b, setB] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [communityPhotos, setCommunityPhotos] = useState([])
  const [heroIdx, setHeroIdx] = useState(0)
  const [galleries, setGalleries] = useState([])
  const [galleryItems, setGalleryItems] = useState({})
  const [activeGalleryType, setActiveGalleryType] = useState(null)
  const [currentCardIdx, setCurrentCardIdx] = useState(0)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [childRentals, setChildRentals] = useState([])
  const [rentalFilters, setRentalFilters] = useState({ beds: '', baths: '', price_min: '', price_max: '' })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setHeroIdx(0)
    setGalleries([])
    setGalleryItems({})
    setActiveGalleryType(null)
    setCurrentCardIdx(0)

    const API = import.meta.env.VITE_API_BASE || 'https://cybercheck-api-database.vercel.app'

    Promise.all([
      fetchBusinessBySlug(slug),
      fetch(`${API}/api/gcr/community-photos/${encodeURIComponent(slug)}`)
        .then(r => r.ok ? r.json() : { photos: [] }),
      fetch(`${API}/api/gcr/entities/${encodeURIComponent(slug)}`)
        .then(r => r.ok ? r.json() : { galleries: [], items: [] })
    ])
      .then(([data, photosData, entityData]) => {
        if (!cancelled) {
          setB(data)
          setCommunityPhotos(photosData.photos || [])
          setGalleries(entityData.galleries || [])
          const itemsByGallery = {}
          let firstGalleryType = null
          if (entityData.galleries?.length) {
            entityData.galleries.forEach((g, idx) => {
              const items = (entityData.items || []).filter(i => i.entity_id === (entityData.entity?.id))
              itemsByGallery[g.gallery_type] = items
              if (idx === 0 || items.length > 0) {
                firstGalleryType = g.gallery_type
              }
            })
          }
          setGalleryItems(itemsByGallery)
          if (firstGalleryType) setActiveGalleryType(firstGalleryType)
          setLoading(false)
        }
      })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })

    return () => { cancelled = true }
  }, [slug])

  // Fetch child rental units if this is a parent property
  useEffect(() => {
    if (!b || b.category !== 'stay') return
    let cancelled = false
    const loadChildren = async () => {
      const children = await fetchChildRentals(b.slug, rentalFilters)
      if (!cancelled) setChildRentals(children)
    }
    loadChildren()
    return () => { cancelled = true }
  }, [b, rentalFilters])

  if (loading) return <div className="page safe-top safe-bottom" style={{ padding: '20px', color: 'white' }}>Loading…</div>
  if (error)   return <div className="page safe-top safe-bottom" style={{ padding: '20px', color: 'white' }}>Error: {error}</div>
  if (!b)      return <div className="page safe-top safe-bottom" style={{ padding: '20px', color: 'white' }}>Not found</div>

  const isSaved = savedPlaces.some(p => p.id === b.id)
  const isActivity = b.category === 'activities'
  const isFood = b.category === 'food'
  const isNightlife = b.category === 'nightlife'
  const isShopping = b.category === 'shopping'

  const allPhotos = b.photos?.length ? b.photos : (b.hero_image_url ? [b.hero_image_url] : [])
  const heroPhoto = allPhotos[heroIdx] || b.hero_image_url

  function share() {
    const url = window.location.href
    if (navigator.share) navigator.share({ title: b.name, url }).catch(() => {})
    else { navigator.clipboard?.writeText(url); alert('Link copied') }
  }

  function getDirections() {
    if (b.directions_url) return window.open(b.directions_url, '_blank')
    if (b.latitude && b.longitude) return window.open(`https://maps.google.com/?q=${b.latitude},${b.longitude}`, '_blank')
    if (b.address) return window.open(`https://maps.google.com/?q=${encodeURIComponent(b.address)}`, '_blank')
  }

  return (
    <div className="detail-page page safe-top safe-bottom">

      {/* ── Hero ── */}
      <div className="detail-hero" style={{ height: 280 }}>
        {heroPhoto
          ? <img src={heroPhoto} alt={b.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a1a2e,#12121f)' }} />
        }
        <div className="detail-hero-overlay" />
        <button className="back-btn-sm detail-back" onClick={() => navigate(-1)}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} width={20} height={20}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {b.verified && <div className="detail-verified">✓ Verified</div>}
        {allPhotos.length > 1 && (
          <div className="detail-hero-nav">
            {allPhotos.map((_, i) => (
              <button key={i} className={`detail-hero-dot ${i === heroIdx ? 'active' : ''}`}
                onClick={() => setHeroIdx(i)} />
            ))}
          </div>
        )}
        {allPhotos.length > 1 && (
          <div className="detail-photo-counter">{heroIdx + 1} / {allPhotos.length}</div>
        )}
      </div>

      <div className="detail-content">

        {/* ── Name + rating ── */}
        <div className="detail-top">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="detail-name">{b.name}</h1>
            {b.subtitle && <div className="detail-sub">{b.subtitle}</div>}
            {b.city && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>📍 {b.city}</div>}
          </div>
          {b.rating ? (
            <div className="detail-rating">
              <div>⭐ {b.rating}</div>
              {b.review_count > 0 && <div className="detail-reviews">{b.review_count} reviews</div>}
            </div>
          ) : null}
        </div>

        {/* ── Tags / badges ── */}
        {(b.live_music || b.happy_hour_text || (b.tags && b.tags.length > 0)) && (
          <div className="detail-tags-row">
            {b.live_music && <span className="badge badge-music">🎵 Live Music</span>}
            {b.happy_hour_text && <span className="badge badge-happy">🍹 Happy Hour</span>}
            {(b.tags || []).map(t => <span key={t} className="detail-tag-pill">{t}</span>)}
          </div>
        )}

        {/* ── Trip Swipe CTAs ── */}
        <div className="detail-ctas">
          <button
            className={isSaved ? 'cta-saved' : 'cta-add'}
            onClick={() => isSaved ? removeSavedPlace(b.id) : addSavedPlace(b)}
          >
            {isSaved ? '✓ Saved to Trip' : '+ Add to Trip'}
          </button>
          {b.booking_url && (
            <a className="cta-book-detail" href={b.booking_url} target="_blank" rel="noopener noreferrer">
              📅 Book
            </a>
          )}
        </div>

        {/* ── Action row ── */}
        <div className="detail-row">
          {(b.directions_url || b.latitude || b.address) && (
            <button className="detail-action-btn" onClick={getDirections}>
              <span>🗺️</span><span>Directions</span>
            </button>
          )}
          {b.phone && (
            <button className="detail-action-btn" onClick={() => { window.location.href = `tel:${b.phone}` }}>
              <span>📞</span><span>Call</span>
            </button>
          )}
          {b.website_url && (
            <a className="detail-action-btn" href={b.website_url} target="_blank" rel="noopener noreferrer">
              <span>🌐</span><span>Website</span>
            </a>
          )}
          <button className="detail-action-btn" onClick={share}>
            <span>↗️</span><span>Share</span>
          </button>
        </div>

        {/* ── Social links ── */}
        {(b.social?.instagram || b.social?.facebook || b.social?.tiktok) && (
          <div className="detail-social-row">
            {b.social.instagram && (
              <a href={b.social.instagram.startsWith('http') ? b.social.instagram : `https://instagram.com/${b.social.instagram}`}
                target="_blank" rel="noopener noreferrer" className="detail-social-btn">
                📸 Instagram
              </a>
            )}
            {b.social.facebook && (
              <a href={b.social.facebook} target="_blank" rel="noopener noreferrer" className="detail-social-btn">
                👍 Facebook
              </a>
            )}
            {b.social.tiktok && (
              <a href={b.social.tiktok.startsWith('http') ? b.social.tiktok : `https://tiktok.com/@${b.social.tiktok}`}
                target="_blank" rel="noopener noreferrer" className="detail-social-btn">
                🎵 TikTok
              </a>
            )}
          </div>
        )}

        {/* ── About / description ── */}
        {b.description && (
          <div className="detail-section">
            <h3>About</h3>
            <p className="detail-body-text">{b.description}</p>
          </div>
        )}

        {/* ── About bullets ── */}
        {b.about_bullets?.length > 0 && (
          <div className="detail-bullets">
            {b.about_bullets.map((bullet, i) => (
              <div key={bullet.id || i} className="detail-bullet-row">
                <span>{bullet.icon || '✦'}</span>
                <span>{bullet.text || bullet.body_text || bullet.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Key info ── */}
        <div className="detail-info-grid">
          {b.address && (
            <div className="info-item">
              <span className="info-icon">📍</span><span>{b.address}</span>
            </div>
          )}
          {b.phone && (
            <div className="info-item">
              <span className="info-icon">📞</span><span>{b.phone}</span>
            </div>
          )}
          {b.price_per_person && (
            <div className="info-item">
              <span className="info-icon">💰</span><span>{b.price_per_person}</span>
            </div>
          )}
          {b.duration && (
            <div className="info-item">
              <span className="info-icon">⏱</span><span>{b.duration}</span>
            </div>
          )}
          {b.price_range && (
            <div className="info-item">
              <span className="info-icon">💲</span><span>{b.price_range}</span>
            </div>
          )}
        </div>

        {/* ── Features ── */}
        {b.features?.length > 0 && (
          <div className="detail-section">
            <h3>Features</h3>
            <div className="detail-pills">
              {b.features.map((f, i) => (
                <span key={f.id || i} className="detail-pill">✓ {f.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Perfect For ── */}
        {b.perfect_for?.length > 0 && (
          <div className="detail-section">
            <h3>Perfect For</h3>
            <div className="detail-pills">
              {b.perfect_for.map((p, i) => (
                <span key={p.id || i} className="detail-pill">{p.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Hours ── */}
        <HoursBlock hours={b.hours} />

        {/* ── Legacy sections (rich_text, bullets, grouped_items, cards, gallery, reviews, hours, location) ── */}
        {(b.sections || []).map((sec, i) => <Section key={sec.id || i} sec={sec} />)}

        {/* ── Happy Hour ── */}
        <HappyHourBlock b={b} />

        {/* ── FOOD / NIGHTLIFE ── */}
        {(isFood || isNightlife) && (
          <>
            <MenuBlock title="Menu" data={b.menu} />
            <MenuBlock title="Drinks" data={b.drinks} />
          </>
        )}

        {/* ── ACTIVITIES ── */}
        {isActivity && (
          <>
            {b.activities?.length > 0 && (
              <div className="detail-section">
                <h3>Activities</h3>
                {b.activities.map((a, i) => (
                  <div key={a.id || i} className="detail-activity-card">
                    <div className="detail-activity-name">{a.title || a.name || a.activity_name}</div>
                    {a.description && <div className="detail-activity-desc">{a.description}</div>}
                    <div className="detail-activity-meta">
                      {a.duration && <span>⏱ {a.duration}</span>}
                      {a.min_age && <span>🔞 {a.min_age}+</span>}
                      {a.max_capacity && <span>👥 Up to {a.max_capacity}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {b.pricing?.length > 0 && (
              <div className="detail-section">
                <h3>Pricing</h3>
                <div className="pricing-list">
                  {b.pricing.map((p, i) => (
                    <div key={p.id || i} className="pricing-row">
                      <span className="pricing-label">{p.label || p.title || p.item_name || p.package_name}</span>
                      <span className="pricing-price">
                        {p.price != null ? `$${p.price}` : p.price_text || ''}
                        {p.unit || p.price_unit ? ` / ${p.unit || p.price_unit}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {b.whats_included?.length > 0 && (
              <div className="detail-section">
                <h3>What's Included</h3>
                <div className="detail-bullets">
                  {b.whats_included.map((w, i) => (
                    <div key={w.id || i} className="detail-bullet-row">
                      <span style={{ color: 'var(--green)' }}>✓</span>
                      <span>{w.label || w.title || w.item_name || w.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {b.requirements?.length > 0 && (
              <div className="detail-section">
                <h3>Requirements</h3>
                <div className="detail-bullets">
                  {b.requirements.map((r, i) => (
                    <div key={r.id || i} className="detail-bullet-row">
                      <span>ℹ️</span>
                      <span>{r.label || r.requirement || r.requirement_text || r.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {b.fleet?.length > 0 && (
              <div className="detail-section">
                <h3>Our Fleet</h3>
                <div className="fleet-list">
                  {b.fleet.map((f, i) => (
                    <div key={f.id || i} className="fleet-item">
                      <div className="fleet-name">{f.name || f.title || f.item_name}</div>
                      {f.capacity && <div className="fleet-meta">👥 Up to {f.capacity} guests</div>}
                      {f.weight && <div className="fleet-meta">⚖️ {f.weight}</div>}
                      {f.dimensions && <div className="fleet-meta">📐 {f.dimensions}</div>}
                      {f.description && <div className="fleet-desc">{f.description}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {b.addons?.length > 0 && (
              <div className="detail-section">
                <h3>Add-Ons</h3>
                <div className="pricing-list">
                  {b.addons.map((a, i) => (
                    <div key={a.id || i} className="pricing-row">
                      <span className="pricing-label">
                        {a.label || a.title || a.addon_name}
                        {a.description && <span style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{a.description}</span>}
                      </span>
                      <span className="pricing-price">
                        {a.price != null ? `$${a.price}`
                          : (a.price_min != null && a.price_max != null) ? `$${a.price_min}–$${a.price_max}`
                          : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {b.meeting_points?.length > 0 && (
              <div className="detail-section">
                <h3>Meeting Point</h3>
                {b.meeting_points.map((m, i) => (
                  <div key={m.id || i} className="detail-list-item">
                    <span>📍</span>
                    <div>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{m.name || m.label || m.location_name}</div>
                      {m.address && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{m.address}</div>}
                      {m.parking_info && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>🅿️ {m.parking_info}</div>}
                      {m.checkin_instructions && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>📋 {m.checkin_instructions}</div>}
                      {m.what_to_bring && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>🎒 {m.what_to_bring}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {b.policies?.length > 0 && (
              <div className="detail-section">
                <h3>Policies</h3>
                <div className="detail-bullets">
                  {b.policies.map((p, i) => (
                    <div key={p.id || i} className="detail-bullet-row">
                      <span>📋</span>
                      <div>
                        {p.policy_type && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 2 }}>{p.policy_type}</div>}
                        <span>{p.label || p.title || p.description || p.policy_text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SHOPPING ── */}
        {isShopping && <MenuBlock title="Products" data={b.shopping} />}

        {/* ── Specials ── */}
        {b.specials?.length > 0 && (
          <div className="detail-section">
            <h3>Specials</h3>
            <div className="detail-list">
              {b.specials.map(s => (
                <div key={s.id} className="detail-special-row">
                  <div className="detail-special-badge">{s.special_type || '🏷️'}</div>
                  <div>
                    <div className="detail-special-name">{s.title || s.special_name || s.name}</div>
                    {s.description && <div className="detail-special-desc">{s.description}</div>}
                    {s.discount_text && <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 3 }}>{s.discount_text}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Events ── */}
        {b.events?.length > 0 && (
          <div className="detail-section">
            <h3>Upcoming Events</h3>
            <div className="detail-list">
              {b.events.slice(0, 8).map(e => (
                <div key={e.id} className="detail-event-row">
                  <div className="detail-event-icon">{e.event_type === 'live_music' ? '🎵' : '🎉'}</div>
                  <div>
                    <div className="detail-event-name">{e.title || e.event_name}</div>
                    {e.artist_name && <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 2 }}>🎤 {e.artist_name}</div>}
                    {e.event_date && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                        {new Date(e.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {e.start_time && ` · ${fmt12(e.start_time)}`}
                      </div>
                    )}
                    {!e.event_date && e.day_of_week != null && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                        {DAYS[e.day_of_week]}{e.recurring ? ' (weekly)' : ''}
                        {e.start_time && ` · ${fmt12(e.start_time)}`}
                      </div>
                    )}
                    {e.description && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{e.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── QnA ── */}
        {b.qna?.length > 0 && (
          <div className="detail-section">
            <h3>FAQ</h3>
            <div className="qna-list">
              {b.qna.map((q, i) => (
                <div key={q.id || i} className="qna-item">
                  <div className="qna-q">{q.question}</div>
                  {q.answer && <div className="qna-a">{q.answer}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Photo gallery ── */}
        {allPhotos.length > 1 && <PhotoGallery photos={allPhotos} />}

        {/* ── Community / guest photos ── */}
        {communityPhotos.length > 0 && (
          <div className="detail-section">
            <h3>📸 Guest Photos</h3>
            <div className="detail-photo-grid">
              {communityPhotos.map(p => (
                <div key={p.id} className="detail-photo-cell">
                  <img src={p.image_url} alt={p.caption || 'Guest photo'}
                    onError={e => { e.target.style.display = 'none' }} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Booking slots ── */}
        {b.booking_slots?.length > 0 && (
          <div className="detail-section">
            <h3>Available Times</h3>
            <div className="detail-slots">
              {b.booking_slots.map((slot, i) => (
                <div key={slot.id || i} className="detail-slot">
                  <div className="detail-slot-time">{fmt12(slot.start_time)}{slot.end_time ? ` – ${fmt12(slot.end_time)}` : ''}</div>
                  {slot.label && <div className="detail-slot-label">{slot.label}</div>}
                  {slot.capacity && <div className="detail-slot-cap">👥 {slot.capacity} spots</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Gallery Swiper for Rentals ── */}
        {galleries.length > 0 && (
          <div className="detail-section">
            <h3>Browse Gallery</h3>

            {/* Location picker for rentals */}
            {activeGalleryType === 'rooms' && (
              <div style={{ marginBottom: 20 }}>
                <LocationPicker
                  onSelect={setSelectedLocation}
                  initialValue={selectedLocation?.name || ''}
                />
                {selectedLocation && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                    📍 {selectedLocation.distance}km from {b.name}
                  </div>
                )}
              </div>
            )}

            {/* Gallery type tabs */}
            <div className="gallery-tabs">
              {galleries.map(g => (
                <button
                  key={g.id}
                  className={`gallery-tab ${activeGalleryType === g.gallery_type ? 'active' : ''}`}
                  onClick={() => {
                    setActiveGalleryType(g.gallery_type)
                    setCurrentCardIdx(0)
                  }}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {/* Swipe cards */}
            {activeGalleryType && galleryItems[activeGalleryType]?.length > 0 ? (
              <div className="gallery-swiper">
                {galleryItems[activeGalleryType].map((item, idx) => (
                  currentCardIdx === idx && (
                    <SwipeCard
                      key={item.id || idx}
                      item={item}
                      onSwipe={(action) => {
                        const API = import.meta.env.VITE_API_BASE || 'https://cybercheck-api-database.vercel.app'
                        const userId = localStorage.getItem('gcr_user_id') || 'anon'
                        fetch(`${API}/api/gcr/swipe-item`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            user_id: userId,
                            section_item_id: item.id,
                            entity_id: b.id,
                            action,
                          }),
                        }).catch(() => {})

                        if (idx < galleryItems[activeGalleryType].length - 1) {
                          setCurrentCardIdx(idx + 1)
                        } else {
                          setCurrentCardIdx(0)
                        }
                      }}
                      onSave={() => {
                        addSavedPlace?.({ ...b, saved_item: item.id })
                      }}
                    />
                  )
                ))}
              </div>
            ) : activeGalleryType ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.5)' }}>
                No items in this gallery
              </div>
            ) : null}
          </div>
        )}

        {/* ── Child Rental Units (for parent properties) ── */}
        {b.category === 'stay' && childRentals.length > 0 && (
          <div className="detail-section">
            <h3>🏠 Available Rental Units</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
              {childRentals.map(child => (
                <div
                  key={child.id}
                  onClick={() => navigate(`/business/${child.slug}`)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: 12,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
                >
                  {child.hero_image_url && (
                    <img src={child.hero_image_url} alt={child.name} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }} onError={e => { e.target.style.display = 'none' }} />
                  )}
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{child.name}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>{child.type}</div>
                  {child.bedrooms || child.bathrooms ? (
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                      {child.bedrooms && <span>🛏️ {child.bedrooms} bed{child.bedrooms > 1 ? 's' : ''}</span>}
                      {child.bathrooms && <span> · {child.bathrooms} bath</span>}
                    </div>
                  ) : null}
                  {child.price_range && <div style={{ fontSize: 12, color: '#7c6af7', fontWeight: 600, marginTop: 6 }}>{child.price_range}</div>}
                  {child.rental_company && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>via {child.rental_company}</div>}
                </div>
              ))}
            </div>

            {/* Filter controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                type="number"
                placeholder="Min price"
                value={rentalFilters.price_min}
                onChange={e => setRentalFilters({ ...rentalFilters, price_min: e.target.value })}
                style={{ padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13 }}
              />
              <input
                type="number"
                placeholder="Max price"
                value={rentalFilters.price_max}
                onChange={e => setRentalFilters({ ...rentalFilters, price_max: e.target.value })}
                style={{ padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13 }}
              />
              <input
                type="number"
                placeholder="Bedrooms"
                value={rentalFilters.beds}
                onChange={e => setRentalFilters({ ...rentalFilters, beds: e.target.value })}
                style={{ padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13 }}
              />
              <input
                type="number"
                placeholder="Bathrooms"
                value={rentalFilters.baths}
                onChange={e => setRentalFilters({ ...rentalFilters, baths: e.target.value })}
                style={{ padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: 13 }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
