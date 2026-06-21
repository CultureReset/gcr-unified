import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './RentalListings.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://gcr-api-clean.vercel.app'

export default function RentalListings() {
  const navigate = useNavigate()
  const [rentals, setRentals] = useState([])
  const [loading, setLoading] = useState(true)
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')

  useEffect(() => {
    async function loadRentals() {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/api/rentals`)
        if (!res.ok) throw new Error('Failed to load rentals')
        const data = await res.json()
        setRentals(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error loading rentals:', err)
        setRentals([])
      } finally {
        setLoading(false)
      }
    }
    loadRentals()
  }, [])

  if (loading) return <div className="rental-listings-loading">Loading rentals...</div>

  return (
    <div className="rental-listings">
      <div className="rental-hero">
        <h1>🏨 Vacation Rentals</h1>
        <p>Find your perfect place to stay</p>
      </div>

      <div className="rental-container">
        <div className="date-picker">
          <input
            type="date"
            placeholder="Check-in"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
          <input
            type="date"
            placeholder="Check-out"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>

        {rentals.length === 0 ? (
          <div className="no-rentals">No rentals available</div>
        ) : (
          <div className="rentals-grid">
            {rentals.map((rental) => (
              <div key={rental.id} className="rental-card">
                {rental.photo_urls?.[0] && (
                  <img src={rental.photo_urls[0]} alt={rental.name} className="rental-image" />
                )}
                <div className="rental-info">
                  <h3>{rental.name}</h3>
                  {rental.bedrooms && (
                    <p className="rental-details">
                      🛏️ {rental.bedrooms} bed • 🛁 {rental.bathrooms} bath • 👥 {rental.capacity} guests
                    </p>
                  )}
                  {rental.nightly_price && (
                    <p className="price">${rental.nightly_price}/night</p>
                  )}
                  {rental.amenities?.length > 0 && (
                    <div className="amenities">
                      {rental.amenities.slice(0, 3).map((amenity, idx) => (
                        <span key={idx} className="amenity-tag">{amenity}</span>
                      ))}
                    </div>
                  )}
                  <button
                    className="view-btn"
                    onClick={() => navigate(`/rental/${rental.slug}`)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
