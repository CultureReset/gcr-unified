import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ArtistProfile.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://gcr-api-clean.vercel.app'

/**
 * A show date the way someone reads it off a poster. A recurring weekly slot
 * has no date at all, only a day, so fall back to that rather than printing
 * nothing.
 */
function fmtShowDate(date, dayOfWeek) {
  if (!date) return dayOfWeek ? `Every ${dayOfWeek}` : ''
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

/** "19:00:00" -> "7:00 PM". */
function fmtShowTime(t) {
  if (!t) return ''
  const [hRaw, min] = t.split(':')
  const h = Number(hRaw)
  if (Number.isNaN(h)) return ''
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${min ?? '00'} ${period}`
}

export default function ArtistProfile() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [artist, setArtist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('about')
  const [reviews, setReviews] = useState([])
  const [reviewStats, setReviewStats] = useState(null)
  const [reviewForm, setReviewForm] = useState({ name: '', email: '', rating: 5, title: '', body: '' })
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewMsg, setReviewMsg] = useState(null)
  const [bookingForm, setBookingForm] = useState({ name: '', email: '', phone: '', date: '', notes: '' })
  const [bookingStatus, setBookingStatus] = useState(null)
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [galleryPage, setGalleryPage] = useState(0)
  const [saved, setSaved] = useState(false)
  const GALLERY_PER_PAGE = 9

  useEffect(() => {
    async function loadArtist() {
      try {
        const res = await fetch(`${API_BASE}/api/artists/${slug}`)
        if (!res.ok) throw new Error('Artist not found')
        setArtist(await res.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadArtist()
    // Load reviews in parallel
    Promise.all([
      fetch(`${API_BASE}/api/reviews/${slug}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${API_BASE}/api/reviews/${slug}/stats`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([rv, st]) => {
      if (rv) setReviews(rv.reviews || [])
      if (st) setReviewStats(st)
    })
  }, [slug])

  const handleBooking = async () => {
    if (!bookingForm.name || !bookingForm.email) return
    try {
      const res = await fetch(`${API_BASE}/api/artist-bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artist_slug: slug, ...bookingForm }),
      })
      setBookingStatus(res.ok
        ? { ok: true, msg: 'Booking request sent! The artist will be in touch.' }
        : { ok: false, msg: 'Failed to send booking request. Please try again.' })
    } catch {
      setBookingStatus({ ok: false, msg: 'Failed to send booking request.' })
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

  if (loading) return <div className="artist-profile-loading">Loading artist profile...</div>
  if (error) return <div className="artist-profile-error">{error}</div>
  if (!artist) return <div className="artist-profile-error">Artist not found</div>

  const photos = artist.photos || (artist.photo_url ? [{ url: artist.photo_url }] : [])
  const galleryTotal = Math.ceil(photos.length / GALLERY_PER_PAGE)

  const links = artist.links || {}
  const requests = artist.requests || {}
  const setlist = artist.setlist || []
  const shows = artist.upcoming_shows || []

  const tabs = [
    { id: 'about', label: 'About' },
    ...(setlist.length ? [{ id: 'songs', label: `🎵 Songs (${setlist.length})` }] : []),
    ...(shows.length ? [{ id: 'events', label: `📅 Shows (${shows.length})` }] : []),
    { id: 'book', label: '📅 Book Me' },
    { id: 'reviews', label: reviewStats?.total ? `⭐ Reviews (${reviewStats.total})` : '⭐ Reviews' },
    ...(photos.length > 1 ? [{ id: 'gallery', label: `📸 Photos (${photos.length})` }] : []),
  ]

  return (
    <div className="artist-profile">
      {/* Hero */}
      <div className="artist-hero">
        {artist.photo_url && (
          <img src={artist.photo_url} alt={artist.name} className="artist-hero-image" />
        )}
        <div className="artist-hero-overlay">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button className="back-btn-artist" onClick={() => navigate('/artists')}>← Artists</button>
            <button className={`save-btn-detail ${saved ? 'saved' : ''}`} onClick={() => setSaved(s => !s)} style={{marginLeft:'auto'}}>{saved ? '❤️' : '🤍'}</button>
          </div>
          <h1>{artist.name}</h1>
          {(artist.genre || artist.hometown || shows.length > 0) && (
            <div className="artist-hero-meta">
              {artist.genre && <span>🎵 {artist.genre}</span>}
              {artist.hometown && <span>📍 {artist.hometown}</span>}
              {shows[0] && (
                <span>📅 Next: {fmtShowDate(shows[0].date)} at {shows[0].venue_name}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Social / Contact quick row */}
      <div className="artist-quick-links">
        {links.instagram && (
          <a href={links.instagram} target="_blank" rel="noopener noreferrer" className="artist-quick-btn">📸 Instagram</a>
        )}
        {links.facebook && (
          <a href={links.facebook} target="_blank" rel="noopener noreferrer" className="artist-quick-btn">👥 Facebook</a>
        )}
        {links.spotify && (
          <a href={links.spotify} target="_blank" rel="noopener noreferrer" className="artist-quick-btn">🎵 Spotify</a>
        )}
        {links.youtube && (
          <a href={links.youtube} target="_blank" rel="noopener noreferrer" className="artist-quick-btn">▶️ YouTube</a>
        )}
        {links.website && (
          <a href={links.website} target="_blank" rel="noopener noreferrer" className="artist-quick-btn">🔗 Website</a>
        )}
        {requests.venmo && (
          <a href={`https://venmo.com/${requests.venmo}`} target="_blank" rel="noopener noreferrer" className="artist-quick-btn">💜 Tip</a>
        )}
        {requests.cashtag && (
          <a href={`https://cash.app/$${requests.cashtag}`} target="_blank" rel="noopener noreferrer" className="artist-quick-btn">💵 Tip</a>
        )}
      </div>

      {/* Tabs */}
      <div className="artist-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`artist-tab ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="artist-profile-content">

        {/* About */}
        {activeTab === 'about' && (
          <section className="artist-section">
            {artist.bio && <p className="bio">{artist.bio}</p>}
            {artist.members && <p className="bio">{artist.members}</p>}
            {artist.also_known_as?.length > 0 && (
              <p className="artist-aka">Also known as {artist.also_known_as.map(a => a.alias).join(', ')}</p>
            )}
            {links.booking && (
              <a href={links.booking} target="_blank" rel="noopener noreferrer" className="artist-book-btn">
                📅 Book via External Site
              </a>
            )}
          </section>
        )}

        {/* Songs */}
        {activeTab === 'songs' && setlist.length > 0 && (
          <section className="artist-section">
            <h2>🎵 Song List ({setlist.length})</h2>
            <div className="songs-grid">
              {setlist.map(song => (
                <div key={song.id} className="song-card">
                  <div className="song-title">{song.title}</div>
                  {song.price && <div className="song-price">${song.price}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Shows — real dates from entity_events, each one tapping through to
            the venue's own page. */}
        {activeTab === 'events' && shows.length > 0 && (
          <section className="artist-section">
            <h2>📅 Upcoming Shows</h2>
            <div className="events-list">
              {shows.map(show => (
                <button
                  key={show.id}
                  type="button"
                  className="event-item event-item-link"
                  onClick={() => show.venue_slug && navigate(`/business/${show.venue_slug}`)}
                >
                  <div className="event-date">{fmtShowDate(show.date, show.day_of_week)}</div>
                  <div className="event-venue">{show.venue_name}</div>
                  <div className="event-time">
                    {[fmtShowTime(show.start_time), show.venue_city].filter(Boolean).join(' · ')}
                  </div>
                  {show.cover_charge && <div className="event-cover">{show.cover_charge}</div>}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Book */}
        {activeTab === 'book' && (
          <section className="artist-section">
            <h2>📅 Book {artist.name}</h2>
            {!bookingStatus ? (
              <div className="booking-form">
                <input className="booking-input" placeholder="Your name *" value={bookingForm.name}
                  onChange={e => setBookingForm(f => ({ ...f, name: e.target.value }))} />
                <input className="booking-input" placeholder="Email *" type="email" value={bookingForm.email}
                  onChange={e => setBookingForm(f => ({ ...f, email: e.target.value }))} />
                <input className="booking-input" placeholder="Phone" type="tel" value={bookingForm.phone}
                  onChange={e => setBookingForm(f => ({ ...f, phone: e.target.value }))} />
                <input className="booking-input" placeholder="Event date" type="date" value={bookingForm.date}
                  onChange={e => setBookingForm(f => ({ ...f, date: e.target.value }))} />
                <textarea className="booking-input" placeholder="Tell us about your event (venue, type, hours needed...)"
                  value={bookingForm.notes} onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))} rows={4} />
                <button className="book-btn" onClick={handleBooking}
                  disabled={!bookingForm.name || !bookingForm.email}>
                  Send Booking Request
                </button>
              </div>
            ) : (
              <div className={`booking-status ${bookingStatus.ok ? 'success' : 'error'}`}>
                {bookingStatus.msg}
              </div>
            )}
          </section>
        )}

        {/* Reviews */}
        {activeTab === 'reviews' && (
          <section className="artist-section">
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
          </section>
        )}

        {/* Gallery */}
        {activeTab === 'gallery' && photos.length > 1 && (
          <section className="artist-section">
            <h2>📸 Photos ({photos.length})</h2>
            <div className="gallery-grid-preview">
              {photos.slice(galleryPage * GALLERY_PER_PAGE, (galleryPage + 1) * GALLERY_PER_PAGE).map((photo, idx) => (
                <img key={idx}
                  src={photo.url || photo}
                  alt={`${artist.name} ${galleryPage * GALLERY_PER_PAGE + idx + 1}`}
                  className="gallery-preview-img"
                  onClick={() => setLightboxIdx(galleryPage * GALLERY_PER_PAGE + idx)} />
              ))}
            </div>
            {galleryTotal > 1 && (
              <div className="gallery-pagination">
                <button disabled={galleryPage === 0} onClick={() => setGalleryPage(p => p - 1)}>← Prev</button>
                <span>{galleryPage + 1} / {galleryTotal}</span>
                <button disabled={galleryPage >= galleryTotal - 1} onClick={() => setGalleryPage(p => p + 1)}>Next →</button>
              </div>
            )}
          </section>
        )}

      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div className="artist-lightbox" onClick={() => setLightboxIdx(null)}>
          <button className="lightbox-close">✕</button>
          <button className="lightbox-prev" onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i - 1 + photos.length) % photos.length) }}>‹</button>
          <img src={photos[lightboxIdx]?.url || photos[lightboxIdx]} alt="" onClick={e => e.stopPropagation()} />
          <button className="lightbox-next" onClick={e => { e.stopPropagation(); setLightboxIdx(i => (i + 1) % photos.length) }}>›</button>
          <div className="lightbox-counter">{lightboxIdx + 1} / {photos.length}</div>
        </div>
      )}
    </div>
  )
}
