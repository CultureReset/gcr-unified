import { useEffect, useState } from 'react'
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
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [galleryPage, setGalleryPage] = useState(0)
  const [reviewsPage, setReviewsPage] = useState(0)

  useEffect(() => {
    async function loadBusiness() {
      try {
        const res = await fetch(`${API_BASE}/api/gcr/entity/${encodeURIComponent(slug)}`)
        if (!res.ok) throw new Error('Failed to load business')
        const data = await res.json()
        if (!data.entity) throw new Error('Business not found')
        setBusiness(data.entity)
        setActiveTab('overview')
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

  if (loading) return <div className="detail-page"><div className="loading">Loading...</div></div>
  if (error) return <div className="detail-page"><div className="error">Error: {error}</div></div>
  if (!business) return <div className="detail-page"><div className="error">Business not found</div></div>

  const photos = business.photos || []
  const hours = business.hours || []
  const tags = business.tags || []
  const slides = photos.length > 0 ? photos : [{ image_url: business.hero_image_url }]

  const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()]

  const formatTime = (time) => {
    if (!time) return null
    if (time.includes('am') || time.includes('pm')) return time
    const [h, m] = time.split(':').map(Number)
    return `${(h % 12 || 12)}:${String(m).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: 'ℹ️' },
    { id: 'menu', label: 'Menu', icon: '🍽️' },
    { id: 'happy-hour', label: 'Happy Hour', icon: '🍺' },
    { id: 'hours', label: 'Hours', icon: '🕐' },
    { id: 'location', label: 'Location', icon: '📍' },
    { id: 'gallery', label: 'Photos', icon: '📸' },
  ]

  const GALLERY_PER_PAGE = 10
  const REVIEWS_PER_PAGE = 10
  const galleryTotal = Math.ceil((photos?.length || 0) / GALLERY_PER_PAGE)
  const reviewsTotal = 0

  return (
    <div className="detail-page">
      {/* Header */}
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
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
            {tags.slice(0, 5).map(tag => (
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
              onClick={() => setActiveTab(sec.id)}
            >
              {sec.icon} {sec.label}
            </button>
          ))}
        </div>
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

          {/* Happy Hour */}
          {activeTab === 'happy-hour' && business.hh_days && (
            <section className="content-section">
              <h2>🍺 Happy Hour</h2>
              <p className="hh-schedule">{business.hh_days}</p>
              {business.hh_description && <p>{business.hh_description}</p>}
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
              <h2>Menu</h2>
              <p>Full menu coming soon...</p>
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
