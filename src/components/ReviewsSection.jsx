import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

export default function ReviewsSection({ slug }) {
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    reviewer_name: '',
    reviewer_email: '',
    rating: 5,
    title: '',
    body: ''
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadReviews()
    loadStats()
  }, [slug, page])

  const loadReviews = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/reviews/${slug}?page=${page}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews || [])
      }
    } catch (err) {
      console.error('Error loading reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/reviews/${slug}/stats`)
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.reviewer_name || !formData.reviewer_email || !formData.title || !formData.body) {
      setMessage('Please fill in all fields')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/reviews/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setMessage('Review submitted! Thank you.')
        setFormData({ reviewer_name: '', reviewer_email: '', rating: 5, title: '', body: '' })
        setShowForm(false)
        loadReviews()
        loadStats()
      } else {
        setMessage('Error submitting review')
      }
    } catch (err) {
      setMessage('Error submitting review')
    }
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className="star" style={{ color: i < rating ? '#ffc107' : '#ddd' }}>
        ★
      </span>
    ))
  }

  return (
    <section className="content-section reviews-section">
      <h2>⭐ Reviews</h2>

      {stats && (
        <div className="reviews-stats">
          <div className="rating-summary">
            <div className="rating-large">{stats.average}</div>
            <div className="rating-stars">{renderStars(Math.round(stats.average))}</div>
            <div className="rating-count">{stats.total} reviews</div>
          </div>

          <div className="rating-breakdown">
            {[5, 4, 3, 2, 1].map(rating => (
              <div key={rating} className="rating-bar">
                <span className="rating-label">{rating}★</span>
                <div className="bar-background">
                  <div
                    className="bar-fill"
                    style={{
                      width: stats.total > 0 ? `${(stats.distribution[rating] / stats.total) * 100}%` : '0'
                    }}
                  />
                </div>
                <span className="rating-count">{stats.distribution[rating]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="reviews-actions">
        <button
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : 'Write a Review'}
        </button>
      </div>

      {showForm && (
        <form className="review-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={formData.reviewer_name}
              onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
              placeholder="Your name"
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formData.reviewer_email}
              onChange={(e) => setFormData({ ...formData, reviewer_email: e.target.value })}
              placeholder="Your email"
            />
          </div>

          <div className="form-group">
            <label>Rating *</label>
            <div className="rating-selector">
              {[5, 4, 3, 2, 1].map(star => (
                <button
                  key={star}
                  type="button"
                  className={`star-btn ${formData.rating >= star ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, rating: star })}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Review title"
            />
          </div>

          <div className="form-group">
            <label>Review *</label>
            <textarea
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              placeholder="Share your experience..."
              rows="4"
            />
          </div>

          <button type="submit" className="btn btn-primary">Submit Review</button>
          {message && <div className="form-message">{message}</div>}
        </form>
      )}

      {loading ? (
        <p className="loading">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="no-data">No reviews yet. Be the first to review!</p>
      ) : (
        <>
          <div className="reviews-list">
            {reviews.map((review) => (
              <div key={review.id} className="review-card">
                <div className="review-header">
                  <div className="review-info">
                    <div className="review-name">{review.reviewer_name}</div>
                    <div className="review-rating">{renderStars(review.rating)}</div>
                  </div>
                  <div className="review-date">
                    {new Date(review.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="review-title">{review.title}</div>
                <div className="review-body">{review.body}</div>
                {review.verified_purchase && (
                  <span className="verified-badge">✓ Verified Purchase</span>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="reviews-pagination">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="btn btn-small"
            >
              Previous
            </button>
            <span>{page}</span>
            <button
              onClick={() => setPage(page + 1)}
              className="btn btn-small"
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  )
}
