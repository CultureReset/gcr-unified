import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ServiceDetail.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://gcr-api-clean.vercel.app'

export default function ServiceDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [availability, setAvailability] = useState(null)
  const [checkingAvail, setCheckingAvail] = useState(false)
  const [booking, setBooking] = useState({ name: '', email: '', phone: '', notes: '' })
  const [bookingStatus, setBookingStatus] = useState(null)
  const [reviews, setReviews] = useState([])
  const [reviewStats, setReviewStats] = useState(null)
  const [reviewForm, setReviewForm] = useState({ name: '', email: '', rating: 5, title: '', body: '' })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewMsg, setReviewMsg] = useState(null)
  const [lightboxIdx, setLightboxIdx] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/services/${slug}`)
        if (!res.ok) throw new Error('Not found')
        setService(await res.json())
      } catch {
        setService(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  useEffect(() => {
    if (!service) return
    async function loadReviews() {
      try {
        const [rv, st] = await Promise.all([
          fetch(`${API_BASE}/api/reviews/${slug}`).then(r => r.json()),
          fetch(`${API_BASE}/api/reviews/${slug}/stats`).then(r => r.json()),
        ])
        setReviews(rv.reviews || [])
        setReviewStats(st)
      } catch {}
    }
    loadReviews()
  }, [service, slug])

  const handleCheckAvailability = async () => {
    if (!selectedDate) return
    setCheckingAvail(true)
    try {
      const res = await fetch(`${API_BASE}/api/services/${slug}/availability?date=${selectedDate}&time=${selectedTime}`)
      const data = await res.json()
      setAvailability(data)
    } catch {
      setAvailability(null)
    } finally {
      setCheckingAvail(false)
    }
  }

  const handleBook = async () => {
    if (!selectedDate || !booking.name || !booking.email) return
    try {
      const res = await fetch(`${API_BASE}/api/services/${slug}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: booking.name,
          guest_email: booking.email,
          guest_phone: booking.phone,
          check_in_date: selectedDate,
          check_in_time: selectedTime || null,
          notes: booking.notes,
        }),
      })
      const data = await res.json()
      setBookingStatus(res.ok
        ? { ok: true, msg: 'Booking confirmed! You\'ll receive a confirmation email.' }
        : { ok: false, msg: data.error || 'Booking failed' })
    } catch {
      setBookingStatus({ ok: false, msg: 'Booking failed. Please try again.' })
    }
  }

  const handleReviewSubmit = async () => {
    if (!reviewForm.name || !reviewForm.rating) return
    setReviewSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/reviews/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewForm),
      })
      if (res.ok) {
        setReviewMsg('Review submitted! It will appear after approval.')
        setReviewForm({ name: '', email: '', rating: 5, title: '', body: '' })
      } else {
        setReviewMsg('Failed to submit review.')
      }
    } catch {
      setReviewMsg('Failed to submit review.')
    } finally {
      setReviewSubmitting(false)
    }
  }

  if (loading) return <div className="service-loading">Loading...</div>
  if (!service) return <div className="service-error">Service not found</div>

  const photos = service.photo_urls || []
  const amenities = service.amenities || []

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'book', label: '📅 Book' },
    ...(amenities.length ? [{ id: 'highlights', label: 'Highlights' }] : []),
    { id: 'reviews', label: `Reviews${reviewStats?.total ? ` (${reviewStats.total})` : ''}` },
    { id: 'policies', label: 'Policies' },
  ]

  return (
    <div className="service-detail">

      {/* Photo Gallery */}
      {photos.length > 0 && (
        <div className="service-gallery">
          <div className="service-gallery-grid">
            {photos.slice(0, 5).map((url, i) => (
              <div
                key={i}
                className={`service-gallery-item ${i === 0 ? 'main' : ''}`}
                onClick={() => setLightboxIdx(i)}
              >
                <img src={url} alt={`${service.name} ${i + 1}`} />
                {i === 4 && photos.length > 5 && (
                  <div className="gallery-more-overlay">+{photos.length - 5} more</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="service-detail-content">

        {/* Header */}
        <div className="service-header">
          <div className="service-header-left">
            <h1>{service.name}</h1>
            {reviewStats?.total > 0 && (
              <div className="service-rating">⭐ {reviewStats.average?.toFixed(1)} · {reviewStats.total} reviews</div>
            )}
          </div>
          {service.nightly_price && (
            <div className="service-price">
              <span className="price-amount">${service.nightly_price}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="service-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`service-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="service-section">
            {service.description && (
              <div className="service-block">
                <h2>About This Service</h2>
                <p>{service.description}</p>
              </div>
            )}
            {service.house_rules && (
              <div className="service-block">
                <h2>Terms & Conditions</h2>
                <p>{service.house_rules}</p>
              </div>
            )}
          </div>
        )}

        {/* Book */}
        {activeTab === 'book' && (
          <div className="service-section">
            <h2>Book This Service</h2>
            <div className="booking-form">
              <div className="date-row">
                <div className="date-field">
                  <label>Date *</label>
                  <input type="date" value={selectedDate} min={new Date().toISOString().split('T')[0]}
                    onChange={e => { setSelectedDate(e.target.value); setAvailability(null) }} />
                </div>
                <div className="date-field">
                  <label>Time (optional)</label>
                  <input type="time" value={selectedTime} onChange={e => setSelectedTime(e.target.value)} />
                </div>
              </div>

              <button className="check-avail-btn" onClick={handleCheckAvailability}
                disabled={!selectedDate || checkingAvail}>
                {checkingAvail ? 'Checking...' : 'Check Availability'}
              </button>

              {availability && (
                <div className={`avail-status ${availability.available ? 'available' : 'unavailable'}`}>
                  {availability.available ? '✓ Available' : '✗ Not available — try a different time'}
                  {availability.booked_times?.length > 0 && (
                    <div className="booked-times">Already booked: {availability.booked_times.join(', ')}</div>
                  )}
                </div>
              )}

              {!bookingStatus && (
                <>
                  <input className="booking-input" placeholder="Your name *" value={booking.name}
                    onChange={e => setBooking(b => ({ ...b, name: e.target.value }))} />
                  <input className="booking-input" placeholder="Email *" type="email" value={booking.email}
                    onChange={e => setBooking(b => ({ ...b, email: e.target.value }))} />
                  <input className="booking-input" placeholder="Phone" type="tel" value={booking.phone}
                    onChange={e => setBooking(b => ({ ...b, phone: e.target.value }))} />
                  <textarea className="booking-input" placeholder="Notes or special requests" value={booking.notes}
                    onChange={e => setBooking(b => ({ ...b, notes: e.target.value }))} rows={3} />
                  <button className="book-btn" onClick={handleBook}
                    disabled={!selectedDate || !booking.name || !booking.email}>
                    Book Now
                  </button>
                </>
              )}

              {bookingStatus && (
                <div className={`booking-status ${bookingStatus.ok ? 'success' : 'error'}`}>
                  {bookingStatus.msg}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Highlights */}
        {activeTab === 'highlights' && amenities.length > 0 && (
          <div className="service-section">
            <h2>Highlights</h2>
            <div className="highlights-list">
              {amenities.map((a, i) => (
                <div key={i} className="highlight-item">✓ {a}</div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {activeTab === 'reviews' && (
          <div className="service-section">
            {reviewStats?.total > 0 && (
              <div className="review-stats">
                <div className="review-avg">⭐ {reviewStats.average?.toFixed(1)}</div>
                <div className="review-count">{reviewStats.total} reviews</div>
                <div className="review-bars">
                  {[5,4,3,2,1].map(star => (
                    <div key={star} className="review-bar-row">
                      <span>{star}★</span>
                      <div className="review-bar">
                        <div className="review-bar-fill"
                          style={{ width: `${reviewStats.total ? ((reviewStats.distribution?.[star] || 0) / reviewStats.total * 100) : 0}%` }} />
                      </div>
                      <span>{reviewStats.distribution?.[star] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="reviews-list">
              {reviews.map((r, i) => (
                <div key={r.id || i} className="review-card">
                  <div className="review-header">
                    <span className="reviewer-name">{r.reviewer_name}</span>
                    <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="review-date">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.title && <div className="review-title">{r.title}</div>}
                  {r.body && <div className="review-body">{r.body}</div>}
                </div>
              ))}
              {reviews.length === 0 && <p className="no-reviews">No reviews yet. Be the first!</p>}
            </div>
            <div className="review-form">
              <h3>Leave a Review</h3>
              <div className="star-picker">
                {[1,2,3,4,5].map(s => (
                  <button key={s} className={`star-btn ${reviewForm.rating >= s ? 'active' : ''}`}
                    onClick={() => setReviewForm(f => ({ ...f, rating: s }))}>★</button>
                ))}
              </div>
              <input className="review-input" placeholder="Your name *" value={reviewForm.name}
                onChange={e => setReviewForm(f => ({ ...f, name: e.target.value }))} />
              <input className="review-input" placeholder="Email" type="email" value={reviewForm.email}
                onChange={e => setReviewForm(f => ({ ...f, email: e.target.value }))} />
              <input className="review-input" placeholder="Review title" value={reviewForm.title}
                onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))} />
              <textarea className="review-input" placeholder="Your review" value={reviewForm.body}
                onChange={e => setReviewForm(f => ({ ...f, body: e.target.value }))} rows={4} />
              {reviewMsg && <div className="review-msg">{reviewMsg}</div>}
              <button className="submit-review-btn" onClick={handleReviewSubmit}
                disabled={reviewSubmitting || !reviewForm.name}>
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        )}

        {/* Policies */}
        {activeTab === 'policies' && (
          <div className="service-section">
            <h2>Policies</h2>
            {service.house_rules && (
              <div className="policy-block">
                <h3>Terms & Conditions</h3>
                <p>{service.house_rules}</p>
              </div>
            )}
            <div className="policy-block">
              <p className="policy-note">For cancellation or refund inquiries, please contact the provider directly.</p>
            </div>
          </div>
        )}

        <button className="back-btn" onClick={() => navigate('/services')}>← Back to Services</button>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div className="service-lightbox" onClick={() => setLightboxIdx(null)}>
          <button className="lightbox-close">✕</button>
          <button className="lightbox-prev" onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + photos.length) % photos.length) }}>‹</button>
          <img src={photos[lightboxIdx]} alt="" onClick={e => e.stopPropagation()} />
          <button className="lightbox-next" onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % photos.length) }}>›</button>
          <div className="lightbox-counter">{lightboxIdx + 1} / {photos.length}</div>
        </div>
      )}
    </div>
  )
}
