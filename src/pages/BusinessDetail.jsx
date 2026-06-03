import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GCRHeader from '../components/GCRHeader'
import { API_BASE } from '../config'
import './BusinessDetail.css'

export default function RestaurantDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [activeTab, setActiveTab] = useState(null)
  const [activeSubSection, setActiveSubSection] = useState(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [galleryPage, setGalleryPage] = useState(0)
  const [reviewsPage, setReviewsPage] = useState(0)
  const subSectionRefs = useRef({})
  const observerRef = useRef(null)

  useEffect(() => {
    async function loadBusiness() {
      try {
        const res = await fetch(`${API_BASE}/api/gcr/entity/${encodeURIComponent(slug)}`)
        if (!res.ok) throw new Error('Failed to load business')
        const data = await res.json()
        if (!data || !data.slug) throw new Error('Business not found')
        setBusiness(data)
        setActiveTab(data.menu_sections?.length ? 'menu' : 'overview')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadBusiness()
  }, [slug])

  useEffect(() => {
    if (!business?.photos?.length) return
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % business.photos.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [business?.photos?.length])

  // IntersectionObserver: highlight active sub-section chip as user scrolls
  useEffect(() => {
    observerRef.current?.disconnect()
    const els = Object.entries(subSectionRefs.current)
    if (!els.length) return
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gcr-header-h') || '156')
    observerRef.current = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length) setActiveSubSection(visible[0].target.dataset.secid)
      },
      { rootMargin: `-${headerH + 105}px 0px -60% 0px`, threshold: 0 }
    )
    els.forEach(([, el]) => el && observerRef.current.observe(el))
    return () => observerRef.current?.disconnect()
  }, [activeTab, business])

  if (loading) return <div className="detail-page"><div className="loading">Loading...</div></div>
  if (error) return <div className="detail-page"><div className="error">Error: {error}</div></div>
  if (!business) return <div className="detail-page"><div className="error">Business not found</div></div>

  const photos = business.photos || []
  const hours = (business.hours || []).sort((a, b) => (a.day_of_week ?? 0) - (b.day_of_week ?? 0))
  const tags = business.tags || []
  const events = business.events || []
  // API returns photos with .url, normalize to .image_url for carousel
  const slides = photos.length > 0
    ? photos.map(p => ({ ...p, image_url: p.image_url || p.url }))
    : [{ image_url: business.hero_image_url }]

  const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]

  const formatTime = (time) => {
    if (!time) return null
    if (time.includes('am') || time.includes('pm')) return time
    const [h, m] = time.split(':').map(Number)
    return `${(h % 12 || 12)}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`
  }

  const hasActivityExtras = business.highlights?.length || business.known_for?.length || business.good_for?.length || business.what_makes_it_different

  const sections = [
    ...(business.menu_sections?.length  ? [{ id: 'menu',        label: 'Menu',        icon: '🍽️' }] : []),
    ...((business.hh_days || business.hh_sections?.length || business.happy_hour_sections?.length) ? [{ id: 'happy-hour', label: 'Happy Hour', icon: '🍺' }] : []),
    ...(hours.length                    ? [{ id: 'hours',       label: 'Hours',       icon: '🕐' }] : []),
    ...(events.length                   ? [{ id: 'events',      label: 'Events',      icon: '🎉' }] : []),
    { id: 'overview',    label: 'Overview',    icon: 'ℹ️'  },
    ...(hasActivityExtras                ? [{ id: 'experience',  label: 'Experience',  icon: '🎯' }] : []),
    { id: 'location',    label: 'Location',    icon: '📍'  },
    ...(photos.length                   ? [{ id: 'gallery',     label: 'Photos',      icon: '📸' }] : []),
  ]

  // Sub-sections for current tab
  const subSections = activeTab === 'menu'
    ? (business.menu_sections || []).map(s => ({ id: `menu-sec-${s.id || s.section_name}`, label: s.section_name }))
    : activeTab === 'happy-hour'
    ? (business.hh_sections || business.happy_hour_sections || []).map(s => ({ id: `hh-sec-${s.id || s.section_name}`, label: s.section_name || s.name }))
    : []

  const scrollToSubSection = useCallback((id) => {
    const el = subSectionRefs.current[id]
    if (!el) return
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gcr-header-h') || '156')
    const tabsH = 100 // main tabs + sub-section chips height
    const top = el.getBoundingClientRect().top + window.scrollY - headerH - tabsH
    window.scrollTo({ top, behavior: 'smooth' })
    setActiveSubSection(id)
  }, [])

  const GALLERY_PER_PAGE = 10
  const REVIEWS_PER_PAGE = 10
  const galleryTotal = Math.ceil((photos?.length || 0) / GALLERY_PER_PAGE)
  const reviewsTotal = 0

  const handleShareBusiness = () => {
    const businessUrl = `${window.location.origin}/business/${business.slug}`

    if (navigator.share) {
      navigator.share({
        title: business.name,
        text: `Check out ${business.name} on Gulf Coast Radar`,
        url: businessUrl
      }).catch(() => {})
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(businessUrl)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div className="detail-page">
      <GCRHeader />
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        <button className="share-btn" onClick={handleShareBusiness} title="Share this business">📤 Share</button>
      </div>

      {/* Photo Carousel */}
      <div className="carousel-wrap">
        <div className="carousel">
          {slides.map((photo, idx) => (
            <div
              key={idx}
              className={`carousel-slide ${idx === currentSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url(${photo.image_url || photo})` }}
            />
          ))}
          <div className="carousel-overlay" />

          {slides.length > 1 && (
            <>
              <button className="carousel-arrow carousel-prev" onClick={() => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length)}>
                &#8249;
              </button>
              <button className="carousel-arrow carousel-next" onClick={() => setCurrentSlide(prev => (prev + 1) % slides.length)}>
                &#8250;
              </button>
              <div className="carousel-dots">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    className={`dot ${idx === currentSlide ? 'active' : ''}`}
                    onClick={() => setCurrentSlide(idx)}
                  />
                ))}
              </div>
              <div className="carousel-count">{currentSlide + 1} / {slides.length}</div>
            </>
          )}

          {/* Image feature chips */}
          {(() => {
            const tagStrs = (business.tags || []).map(t => (typeof t === 'string' ? t : (t.tag_name || '')).toLowerCase().replace(/[\s-]+/g,'_'))
            const chips = [
              (business.live_music || tagStrs.some(t => t.includes('live_music'))) && { cls: 'chip-music', label: '🎸 Live Music' },
              (business.waterfront || tagStrs.includes('waterfront')) && { cls: 'chip-water', label: '🌊 Waterfront' },
              (business.outdoor_seating || tagStrs.includes('outdoor_seating')) && { cls: 'chip-outdoor', label: '🌿 Outdoor' },
              business.hh_days && { cls: 'chip-hh', label: '🍺 Happy Hour' },
            ].filter(Boolean)
            return chips.length ? (
              <div className="carousel-img-chips">
                {chips.map((c,i) => <span key={i} className={`carousel-img-chip ${c.cls}`}>{c.label}</span>)}
              </div>
            ) : null
          })()}

          {/* Hero Text */}
          <div className="carousel-hero">
            <div className="hero-name">{business.name}</div>
            <div className="hero-meta">
              {business.rating && (
                <span className="hero-rating">
                  ★ {business.rating.toFixed(1)} {business.review_count && `(${business.review_count})`}
                </span>
              )}
              {business.city && <span>📍 {business.city}, {business.state}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Happy Hour Banner */}
      {business.hh_days && (
        <div className="hh-banner">
          🍺 <span className="hh-badge">Happy Hour</span> {business.hh_days}
        </div>
      )}

      {/* Header Section */}
      <div className="business-header">
        <h1>{business.name}</h1>
        {business.subtitle && <p className="subtitle">{business.subtitle}</p>}
        {business.city && <p className="meta">📍 {business.city}, {business.state}</p>}
        {business.phone && <p className="meta">📞 {business.phone}</p>}
        {business.rating && <p className="meta">⭐ {business.rating} ({business.review_count || 0} reviews)</p>}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="badge-row">
            {tags.map(tag => (
              <span key={tag.tag_name} className="badge">{tag.tag_name}</span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          {business.phone && (
            <a href={`tel:${business.phone}`} className="btn btn-call">📞 Call Now</a>
          )}
          {business.directions_url && (
            <a href={business.directions_url} target="_blank" rel="noopener noreferrer" className="btn btn-directions">
              📍 Directions
            </a>
          )}
          {business.menu_url && (
            <a href={business.menu_url} target="_blank" rel="noopener noreferrer" className="btn btn-menu">
              📄 Menu
            </a>
          )}
          {business.reservation_url && (
            <a href={business.reservation_url} target="_blank" rel="noopener noreferrer" className="btn btn-reserve">
              🍽️ Reserve
            </a>
          )}
          {business.order_url && (
            <a href={business.order_url} target="_blank" rel="noopener noreferrer" className="btn btn-order">
              🛵 Order
            </a>
          )}
          {business.website_url && (
            <a href={business.website_url} target="_blank" rel="noopener noreferrer" className="btn btn-website">
              🌐 Website
            </a>
          )}
        </div>

        {/* Social Links */}
        {(business.social_instagram || business.social_facebook) && (
          <div className="social-links">
            {business.social_instagram && (
              <a href={business.social_instagram.startsWith('http') ? business.social_instagram : `https://instagram.com/${business.social_instagram}`} target="_blank" rel="noopener noreferrer" className="social-btn" title="Instagram">
                📱
              </a>
            )}
            {business.social_facebook && (
              <a href={business.social_facebook} target="_blank" rel="noopener noreferrer" className="social-btn" title="Facebook">
                f
              </a>
            )}
          </div>
        )}
      </div>

      {/* Sticky Tabs */}
      <div className="sticky-tabs">
        <div className="tabs-scroll">
          {sections.map(sec => (
            <button
              key={sec.id}
              className={`tab ${activeTab === sec.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(sec.id); setActiveSubSection(null) }}
            >
              {sec.icon} {sec.label}
            </button>
          ))}
        </div>
        {subSections.length > 0 && (
          <div className="subsection-chips-row">
            {subSections.map(ss => (
              <button
                key={ss.id}
                className={`subsection-chip ${activeSubSection === ss.id ? 'active' : ''}`}
                onClick={() => scrollToSubSection(ss.id)}
              >
                {ss.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Layout */}
      <div className="content-layout">
        <main className="content-main">
          {/* Overview */}
          {activeTab === 'overview' && (
            <section className="content-section">
              <h2>About</h2>
              {business.description && <p>{business.description}</p>}
              {tags.length > 0 && (
                <div>
                  <h3>Categories</h3>
                  <div className="tag-row">
                    {tags.map(tag => (
                      <span key={tag.tag_name} className="tag">{tag.tag_name}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Experience */}
          {activeTab === 'experience' && (
            <section className="content-section">
              {business.what_makes_it_different && (
                <div className="exp-block">
                  <h2>What Makes It Different</h2>
                  <p>{business.what_makes_it_different}</p>
                </div>
              )}
              {business.highlights?.length > 0 && (
                <div className="exp-block">
                  <h2>What You'll See</h2>
                  <ul className="exp-list">
                    {business.highlights.map((h, i) => <li key={i}>✓ {h}</li>)}
                  </ul>
                </div>
              )}
              {business.known_for?.length > 0 && (
                <div className="exp-block">
                  <h2>Known For</h2>
                  <div className="tag-row">
                    {business.known_for.map((k, i) => <span key={i} className="tag">{k}</span>)}
                  </div>
                </div>
              )}
              {business.good_for?.length > 0 && (
                <div className="exp-block">
                  <h2>Good For</h2>
                  <div className="tag-row">
                    {business.good_for.map((g, i) => <span key={i} className="tag">{g}</span>)}
                  </div>
                </div>
              )}
              {(business.duration_text || business.price_from != null) && (
                <div className="exp-block">
                  <h2>Trip Details</h2>
                  {business.duration_text && <p>⏱ Duration: {business.duration_text}</p>}
                  {business.price_from != null && (
                    <p>💵 From ${business.price_from}{business.price_unit ? ` / ${business.price_unit}` : ''}</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Happy Hour */}
          {activeTab === 'happy-hour' && (
            <section className="content-section">
              <h2>🍺 Happy Hour</h2>
              {business.hh_days && (
                <p className="hh-schedule">
                  {business.hh_days}
                  {business.hh_start && ` · ${formatTime(business.hh_start)}`}
                  {business.hh_end && ` – ${formatTime(business.hh_end)}`}
                </p>
              )}
              {business.hh_description && <p>{business.hh_description}</p>}
              {(business.hh_sections || business.happy_hour_sections || []).map(sec => (
                <div key={sec.id} className="menu-section" style={{marginTop: 20}}>
                  <h3>{sec.section_name || sec.name}</h3>
                  <div className="menu-items">
                    {(sec.items || sec.happy_hour_items || []).map(item => (
                      <div key={item.id} className="menu-item">
                        <div className="item-header">
                          <span className="item-name">{item.item_name || item.name}</span>
                          {(item.hh_price ?? item.price) != null && (
                            <span className="item-price hh-price">${(item.hh_price ?? item.price)}</span>
                          )}
                        </div>
                        {item.description && <p className="item-desc">{item.description}</p>}
                        {item.original_price != null && (
                          <p className="item-original-price">Was ${item.original_price}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Events */}
          {activeTab === 'events' && (
            <section className="content-section">
              <h2>🎉 Events</h2>
              {events.length === 0 ? (
                <p className="no-data">No upcoming events</p>
              ) : (
                <div className="events-list">
                  {events.map((ev, i) => {
                    const evDate = ev.event_date ? new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : null
                    return (
                      <div key={ev.id || i} className="event-row">
                        <div className="event-row-date">{evDate || (ev.recurring ? ev.day_of_week : 'Ongoing')}</div>
                        <div className="event-row-info">
                          <div className="event-row-name">{ev.event_name || ev.name}</div>
                          {ev.artist_name && <div className="event-row-artist">🎤 {ev.artist_name}</div>}
                          {(ev.start_time || ev.end_time) && (
                            <div className="event-row-time">
                              {formatTime(ev.start_time)}{ev.end_time ? ` – ${formatTime(ev.end_time)}` : ''}
                            </div>
                          )}
                          {ev.cover_charge != null && ev.cover_charge > 0 && (
                            <div className="event-row-cover">Cover: ${ev.cover_charge}</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {/* Hours */}
          {activeTab === 'hours' && hours.length > 0 && (
            <section className="content-section">
              <h2>Hours</h2>
              <ul className="hours-list">
                {hours.map((hr, idx) => (
                  <li key={idx} className={hr.day_of_week === new Date().getDay() ? 'today' : ''}>
                    <span className="day">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][hr.day_of_week || 0]}
                    </span>
                    <span className="time">
                      {hr.is_closed
                        ? 'Closed'
                        : `${formatTime(hr.opens_at) || '—'} – ${formatTime(hr.closes_at) || '—'}`}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Location */}
          {activeTab === 'location' && (
            <section className="content-section">
              <h2>Location</h2>
              <p className="address">
                📍 {business.address_line_1}<br />
                {[business.city, business.state, business.zip].filter(Boolean).join(', ')}
              </p>
              {business.directions_url && (
                <a href={business.directions_url} target="_blank" rel="noopener noreferrer" className="btn btn-directions">
                  📍 Get Directions
                </a>
              )}
            </section>
          )}

          {/* Gallery */}
          {activeTab === 'gallery' && (
            <section className="content-section">
              <h2>Photos</h2>
              <button className="gallery-btn" onClick={() => setGalleryOpen(true)}>
                📸 View All Photos ({photos.length})
              </button>
            </section>
          )}

          {/* Menu */}
          {activeTab === 'menu' && (
            <section className="content-section">
              <h2>🍽️ Menu</h2>
              {business.menu_sections && business.menu_sections.length > 0 ? (
                <div className="menu-container">
                  {business.menu_sections.map(section => {
                    const secId = `menu-sec-${section.id || section.section_name}`
                    return (
                    <div
                      key={section.id}
                      className="menu-section menu-section-anchor"
                      data-secid={secId}
                      ref={el => { subSectionRefs.current[secId] = el }}
                    >
                      <h3>{section.section_name}</h3>
                      <div className="menu-items">
                        {section.items && section.items.map(item => (
                          <div key={item.id} className="menu-item">
                            <div className="item-header">
                              <span className="item-name">{item.item_name}</span>
                              {item.price && <span className="item-price">${item.price.toFixed(2)}</span>}
                            </div>
                            {item.description && <p className="item-desc">{item.description}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )})}
                </div>
              ) : (
                <p className="no-data">No menu available</p>
              )}

              {business.drink_sections && business.drink_sections.length > 0 && (
                <>
                  <h2 style={{marginTop: '32px'}}>🍷 Drinks</h2>
                  <div className="menu-container">
                    {business.drink_sections.map(section => (
                      <div key={section.id} className="menu-section">
                        <h3>{section.section_name}</h3>
                        <div className="menu-items">
                          {section.items && section.items.map(item => (
                            <div key={item.id} className="menu-item">
                              <div className="item-header">
                                <span className="item-name">{item.item_name}</span>
                                {item.price && <span className="item-price">${item.price.toFixed(2)}</span>}
                              </div>
                              {item.description && <p className="item-desc">{item.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {business.happy_hour_sections && business.happy_hour_sections.length > 0 && (
                <>
                  <h2 style={{marginTop: '32px'}}>🍺 Happy Hour Specials</h2>
                  <div className="menu-container">
                    {business.happy_hour_sections.map(section => (
                      <div key={section.id} className="menu-section">
                        <h3>{section.section_name}</h3>
                        <div className="menu-items">
                          {section.items && section.items.map(item => (
                            <div key={item.id} className="menu-item">
                              <div className="item-header">
                                <span className="item-name">{item.item_name}</span>
                                {item.price && <span className="item-price">${item.price.toFixed(2)}</span>}
                              </div>
                              {item.description && <p className="item-desc">{item.description}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </main>

        {/* Sidebar */}
        <aside className="content-sidebar">
          {/* Quick Actions */}
          <div className="sidebar-card">
            <h3 className="sidebar-title">Quick Actions</h3>
            {business.phone && (
              <a href={`tel:${business.phone}`} className="sidebar-btn">📞 Call Now</a>
            )}
            {business.directions_url && (
              <a href={business.directions_url} target="_blank" rel="noopener noreferrer" className="sidebar-btn">
                📍 Directions
              </a>
            )}
            {business.menu_url && (
              <a href={business.menu_url} target="_blank" rel="noopener noreferrer" className="sidebar-btn">
                📄 Menu
              </a>
            )}
            {business.reservation_url && (
              <a href={business.reservation_url} target="_blank" rel="noopener noreferrer" className="sidebar-btn">
                🍽️ Reserve
              </a>
            )}
            {business.order_url && (
              <a href={business.order_url} target="_blank" rel="noopener noreferrer" className="sidebar-btn">
                🛵 Order
              </a>
            )}
            {business.website_url && (
              <a href={business.website_url} target="_blank" rel="noopener noreferrer" className="sidebar-btn">
                🌐 Website
              </a>
            )}
          </div>

          {/* Hours Sidebar */}
          {hours.length > 0 && (
            <div className="sidebar-card">
              <h3 className="sidebar-title">Hours</h3>
              <ul className="hours-list">
                {hours.map((hr, idx) => (
                  <li key={idx} className={hr.day_of_week === new Date().getDay() ? 'today' : ''}>
                    <span className="day">
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][hr.day_of_week || 0]}
                    </span>
                    <span className="time">
                      {hr.is_closed
                        ? 'Closed'
                        : `${formatTime(hr.opens_at) || '—'} – ${formatTime(hr.closes_at) || '—'}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Happy Hour Sidebar */}
          {business.hh_days && (
            <div className="sidebar-card hh-card">
              <h3 className="sidebar-title">🍺 Happy Hour</h3>
              <p>{business.hh_days}</p>
            </div>
          )}
        </aside>
      </div>

      {/* Gallery Modal */}
      {galleryOpen && (
        <div className="modal-overlay" onClick={() => setGalleryOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setGalleryOpen(false)}>✕</button>
            <h2>📸 Photos</h2>
            <div className="gallery-grid">
              {photos.slice(galleryPage * GALLERY_PER_PAGE, (galleryPage + 1) * GALLERY_PER_PAGE).map((photo, idx) => (
                <img key={idx} src={photo.image_url} alt="" className="gallery-img" />
              ))}
            </div>
            {galleryTotal > 1 && (
              <div className="modal-pagination">
                <button disabled={galleryPage === 0} onClick={() => setGalleryPage(p => p - 1)}>← Prev</button>
                <span>Page {galleryPage + 1} of {galleryTotal}</span>
                <button disabled={galleryPage >= galleryTotal - 1} onClick={() => setGalleryPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
