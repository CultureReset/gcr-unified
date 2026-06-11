import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
        const tabs = []
        if (data.menu_sections?.length) tabs.push('menu')
        if (data.hh_days || data.hh_sections?.length || data.happy_hour_sections?.length) tabs.push('happy-hour')
        if (data.events?.length) tabs.push('events')
        setActiveTab(tabs[0] || 'overview')
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

  const scrollToSubSection = useCallback((id) => {
    const el = subSectionRefs.current[id]
    if (!el) return
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--gcr-header-h') || '156')
    const tabsH = 100
    const top = el.getBoundingClientRect().top + window.scrollY - headerH - tabsH
    window.scrollTo({ top, behavior: 'smooth' })
    setActiveSubSection(id)
  }, [])

  if (loading) return <div className="detail-page"><div className="loading">Loading...</div></div>
  if (error) return <div className="detail-page"><div className="error">Error: {error}</div></div>
  if (!business) return <div className="detail-page"><div className="error">Business not found</div></div>

  const photos = business.photos || []
  const hours = (business.hours || []).sort((a, b) => (a.day_of_week ?? 0) - (b.day_of_week ?? 0))
  const GOOGLE_TYPE_NOISE = new Set(['establishment','point_of_interest','food','restaurant','bar','cafe','store','premise','locality','political','sublocality','neighborhood'])
  const seen = new Set()
  const tags = (business.tags || []).filter(t => {
    const name = (t.tag_name || '').toLowerCase().replace(/[\s-]+/g, '_')
    if (GOOGLE_TYPE_NOISE.has(name)) return false
    if (seen.has(name)) return false
    seen.add(name)
    return true
  })
  const events = business.events || []
  const pricing = business.pricing || []
  const whatsIncluded = business.whats_included || []
  const faqs = business.faqs || []
  const requirements = business.requirements || []
  // API returns photos with .url, normalize to .image_url for carousel
  const slides = photos.length > 0
    ? photos.map(p => ({ ...p, image_url: p.image_url || p.url }))
    : [{ image_url: business.hero_image_url }]

  const todayIdx = new Date().getDay()
  const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][todayIdx]

  const formatTime = (time) => {
    if (!time) return null
    if (time.includes('am') || time.includes('pm')) return time
    const [h, m] = time.split(':').map(Number)
    return `${(h % 12 || 12)}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`
  }

  // Open/closed status
  const todayHours = hours.find(h => h.day_of_week === todayIdx)
  const openStatus = (() => {
    if (!todayHours) return null
    if (todayHours.is_closed) return { open: false, label: 'Closed today' }
    const now = new Date()
    const toMins = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m }
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const openMins = toMins(todayHours.open_time)
    const closeMins = toMins(todayHours.close_time)
    if (openMins == null) return null
    if (nowMins < openMins) return { open: false, label: `Opens at ${formatTime(todayHours.open_time)}` }
    if (closeMins && nowMins > closeMins) return { open: false, label: `Closed · Opens ${today}` }
    return { open: true, label: `Open · Closes ${formatTime(todayHours.close_time) || 'late'}` }
  })()

  const hasActivityExtras = business.highlights?.length || business.known_for?.length || business.good_for?.length || business.what_makes_it_different

  const sections = [
    ...(business.menu_sections?.length  ? [{ id: 'menu',        label: 'Menu',        icon: '🍽️' }] : []),
    ...((business.hh_days || business.hh_sections?.length || business.happy_hour_sections?.length) ? [{ id: 'happy-hour', label: 'Happy Hour', icon: '🍺' }] : []),
    ...(pricing.length                  ? [{ id: 'pricing',     label: 'Pricing',     icon: '💰' }] : []),
    ...(hours.length                    ? [{ id: 'hours',       label: 'Hours',       icon: '🕐' }] : []),
    ...(events.length                   ? [{ id: 'events',      label: 'Events',      icon: '🎉' }] : []),
    { id: 'overview',    label: 'Overview',    icon: 'ℹ️'  },
    ...(hasActivityExtras                ? [{ id: 'experience',  label: 'Experience',  icon: '🎯' }] : []),
    ...(faqs.length                     ? [{ id: 'faqs',        label: 'FAQs',        icon: '❓' }] : []),
    { id: 'location',    label: 'Location',    icon: '📍'  },
    ...(photos.length                   ? [{ id: 'gallery',     label: 'Photos',      icon: '📸' }] : []),
  ]

  // Sub-sections for current tab
  const subSections = activeTab === 'menu'
    ? (business.menu_sections || []).map(s => ({ id: `menu-sec-${s.id || s.section_name}`, label: s.section_name }))
    : activeTab === 'happy-hour'
    ? (business.hh_sections || business.happy_hour_sections || []).map(s => ({ id: `hh-sec-${s.id || s.section_name}`, label: s.section_name || s.name }))
    : []

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

        {/* Open/closed status + today's hours */}
        {openStatus && (
          <div className={`open-status ${openStatus.open ? 'open' : 'closed'}`}>
            <span className="open-dot" />
            {openStatus.label}
            {todayHours && !todayHours.is_closed && openStatus.open && todayHours.open_time && (
              <span className="open-hours-today"> · {formatTime(todayHours.open_time)}–{formatTime(todayHours.close_time)}</span>
            )}
          </div>
        )}

        {business.city && <p className="meta">📍 {business.city}, {business.state}</p>}
        {business.rating && <p className="meta">⭐ {business.rating} ({business.review_count || 0} reviews)</p>}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="badge-row">
            {tags.map(tag => (
              <span key={tag.tag_name} className="badge">{tag.tag_name}</span>
            ))}
          </div>
        )}

        {/* Primary CTA — reserve/order/book gets top billing */}
        {(business.reservation_url || business.order_url || business.booking_url) && (
          <div className="primary-cta">
            {business.reservation_url && (
              <a href={business.reservation_url} target="_blank" rel="noopener noreferrer" className="btn-primary-cta">
                🍽️ Make a Reservation
              </a>
            )}
            {business.order_url && (
              <a href={business.order_url} target="_blank" rel="noopener noreferrer" className="btn-primary-cta">
                🛵 Order Online
              </a>
            )}
            {business.booking_url && !business.reservation_url && (
              <a href={business.booking_url} target="_blank" rel="noopener noreferrer" className="btn-primary-cta">
                📅 Book Now
              </a>
            )}
          </div>
        )}

        {/* Secondary Action Buttons */}
        <div className="action-buttons">
          {business.phone && (
            <a href={`tel:${business.phone}`} className="btn btn-call">📞 Call</a>
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
          {business.website_url && (
            <a href={business.website_url} target="_blank" rel="noopener noreferrer" className="btn btn-website">
              🌐 Website
            </a>
          )}
        </div>

        {/* Social Links */}
        {(business.social_instagram || business.social_facebook || business.social_tiktok) && (
          <div className="social-links">
            {business.social_instagram && (
              <a href={business.social_instagram.startsWith('http') ? business.social_instagram : `https://instagram.com/${business.social_instagram}`} target="_blank" rel="noopener noreferrer" className="social-btn social-instagram">
                Instagram
              </a>
            )}
            {business.social_facebook && (
              <a href={business.social_facebook} target="_blank" rel="noopener noreferrer" className="social-btn social-facebook">
                Facebook
              </a>
            )}
            {business.social_tiktok && (
              <a href={business.social_tiktok.startsWith('http') ? business.social_tiktok : `https://tiktok.com/@${business.social_tiktok}`} target="_blank" rel="noopener noreferrer" className="social-btn social-tiktok">
                TikTok
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
              {!business.description && business.editorial_summary && <p>{business.editorial_summary}</p>}
              {business.ai_overview && (
                <div className="ai-summary">
                  <p>{business.ai_overview}</p>
                </div>
              )}
              {business.ai_review_summary && (
                <div className="ai-review-summary">
                  <h3>What Visitors Say</h3>
                  <p>{business.ai_review_summary}</p>
                </div>
              )}

              {/* Amenities grid */}
              {(() => {
                const amenities = [
                  business.dine_in           && { icon: '🍽️', label: 'Dine-in' },
                  business.takeout           && { icon: '🥡', label: 'Takeout' },
                  business.delivery          && { icon: '🛵', label: 'Delivery' },
                  business.curbside_pickup   && { icon: '🚗', label: 'Curbside Pickup' },
                  business.reservable        && { icon: '📅', label: 'Reservations' },
                  business.outdoor_seating   && { icon: '🌿', label: 'Outdoor Seating' },
                  business.live_music        && { icon: '🎸', label: 'Live Music' },
                  business.good_for_groups   && { icon: '👥', label: 'Good for Groups' },
                  business.good_for_children && { icon: '👶', label: 'Kid Friendly' },
                  business.allows_dogs       && { icon: '🐕', label: 'Dog Friendly' },
                  business.good_for_watching_sports && { icon: '📺', label: 'Sports Bar' },
                  business.serves_breakfast  && { icon: '🍳', label: 'Breakfast' },
                  business.serves_brunch     && { icon: '🥂', label: 'Brunch' },
                  business.serves_lunch      && { icon: '🥗', label: 'Lunch' },
                  business.serves_dinner     && { icon: '🍷', label: 'Dinner' },
                  business.serves_beer       && { icon: '🍺', label: 'Beer' },
                  business.serves_wine       && { icon: '🍷', label: 'Wine' },
                  business.serves_cocktails  && { icon: '🍹', label: 'Cocktails' },
                  business.serves_coffee     && { icon: '☕', label: 'Coffee' },
                  business.serves_dessert    && { icon: '🍰', label: 'Dessert' },
                  business.serves_vegetarian && { icon: '🥦', label: 'Vegetarian Options' },
                  business.wheelchair_accessible_entrance && { icon: '♿', label: 'Accessible Entrance' },
                  business.wheelchair_accessible_parking  && { icon: '♿', label: 'Accessible Parking' },
                  business.wheelchair_accessible_restroom && { icon: '♿', label: 'Accessible Restroom' },
                ].filter(Boolean)
                return amenities.length > 0 ? (
                  <div className="amenities-section">
                    <h3>Amenities & Features</h3>
                    <div className="amenities-grid">
                      {amenities.map((a, i) => (
                        <div key={i} className="amenity-item">{a.icon} {a.label}</div>
                      ))}
                    </div>
                  </div>
                ) : null
              })()}

              {business.price_level && (
                <div className="price-level-row">
                  <h3>Price Level</h3>
                  <span>{'💰'.repeat(Math.min(business.price_level, 4))}</span>
                  {business.price_range_low && business.price_range_high && (
                    <span className="price-range-text"> (${business.price_range_low}–${business.price_range_high})</span>
                  )}
                </div>
              )}

              {business.google_maps_uri && (
                <a href={business.google_maps_uri} target="_blank" rel="noopener noreferrer" className="google-maps-link" onClick={e => e.stopPropagation()}>
                  🗺️ View on Google Maps
                </a>
              )}

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

          {/* Pricing */}
          {activeTab === 'pricing' && (
            <section className="content-section">
              <h2>💰 Pricing</h2>
              {pricing.length === 0 ? (
                <p className="no-data">No pricing info available</p>
              ) : (
                <div className="pricing-list">
                  {pricing.map((item, i) => (
                    <div key={item.id || i} className="pricing-row">
                      <div className="pricing-name">{item.item_name}</div>
                      <div className="pricing-right">
                        {item.price != null ? (
                          <span className="pricing-price">${item.price % 1 === 0 ? item.price : item.price.toFixed(2)}</span>
                        ) : (
                          <span className="pricing-price pricing-call">Call for pricing</span>
                        )}
                        {item.description && <div className="pricing-desc">{item.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {whatsIncluded.length > 0 && (
                <div className="whats-included">
                  <h3>✅ What's Included</h3>
                  <ul>
                    {whatsIncluded.map((item, i) => (
                      <li key={item.id || i}>{item.included_item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {requirements.length > 0 && (
                <div className="requirements-list">
                  <h3>📋 Requirements</h3>
                  <ul>
                    {requirements.map((item, i) => (
                      <li key={item.id || i}>{item.requirement_text}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {/* FAQs */}
          {activeTab === 'faqs' && (
            <section className="content-section">
              <h2>❓ Frequently Asked Questions</h2>
              {faqs.length === 0 ? (
                <p className="no-data">No FAQs available</p>
              ) : (
                <div className="faqs-list">
                  {faqs.map((faq, i) => (
                    <div key={faq.id || i} className="faq-row">
                      <div className="faq-question">{faq.question}</div>
                      <div className="faq-answer">{faq.answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Events */}
          {activeTab === 'events' && (
            <section className="content-section">
              <h2>🎉 Events</h2>
              {events.length === 0 ? (
                <p className="no-data">No upcoming events</p>
              ) : (
                <>
                  {/* Unique artist images — deduplicated by image_url */}
                  {(() => {
                    const seen = new Set()
                    const artists = events.filter(ev => {
                      if (!ev.image_url) return false
                      if (seen.has(ev.image_url)) return false
                      seen.add(ev.image_url)
                      return true
                    })
                    return artists.length > 0 ? (
                      <div className="artist-grid">
                        {artists.map(ev => (
                          <div key={ev.image_url} className="artist-card">
                            <img src={ev.image_url} alt={ev.artist_name || ev.event_name} className="artist-card-img" />
                            {ev.artist_name && <div className="artist-card-name">{ev.artist_name}</div>}
                          </div>
                        ))}
                      </div>
                    ) : null
                  })()}

                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0]
                    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0]
                    const groups = {}
                    const noDate = []
                    events.forEach(ev => {
                      if (!ev.event_date) { noDate.push(ev); return }
                      if (!groups[ev.event_date]) groups[ev.event_date] = []
                      groups[ev.event_date].push(ev)
                    })
                    const sortedDates = Object.keys(groups).sort()
                    const dateLabel = d => {
                      if (d === todayStr) return 'Today'
                      if (d === tomorrowStr) return 'Tomorrow'
                      return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                    }
                    return (
                      <div className="events-list">
                        {sortedDates.map(date => (
                          <div key={date} className="event-date-group">
                            <div className="event-date-heading">{dateLabel(date)}</div>
                            {groups[date].map((ev, i) => (
                              <div key={ev.id || i} className="event-row">
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
                            ))}
                          </div>
                        ))}
                        {noDate.map((ev, i) => (
                          <div key={ev.id || i} className="event-row">
                            <div className="event-row-info">
                              <div className="event-row-name">{ev.event_name || ev.name}</div>
                              {ev.artist_name && <div className="event-row-artist">🎤 {ev.artist_name}</div>}
                              {ev.recurring && ev.day_of_week && <div className="event-row-time">Every {ev.day_of_week}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </>
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
