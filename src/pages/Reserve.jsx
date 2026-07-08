import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import './Reserve.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://gcr-api-clean.vercel.app'

// Common dinner-service window, in 30-min increments — used as a fallback
// grid whenever a business hasn't set up (or synced from FareHarbor/Peak/
// Airbnb) real per-slot capacity in business_availability yet. Real slots
// from the API always take priority over this when present for a date.
function defaultTimeOptions() {
  const times = []
  for (let mins = 17 * 60; mins <= 21 * 60 + 30; mins += 30) {
    const h24 = Math.floor(mins / 60)
    const m = mins % 60
    const h12 = h24 % 12 || 12
    times.push({ value: `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`, label: `${h12}:${String(m).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'}` })
  }
  return times
}

function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Reserve() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [business, setBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [availability, setAvailability] = useState([])
  const [toast, setToast] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [partySize, setPartySize] = useState(2)
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState(null)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestPhone, setGuestPhone] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [bizRes, availRes] = await Promise.all([
          fetch(`${API_BASE}/api/gcr/entity/${slug}`),
          fetch(`${API_BASE}/api/email-parser/availability/${slug}`),
        ])
        if (bizRes.ok) setBusiness(await bizRes.json())
        if (availRes.ok) {
          const d = await availRes.json()
          setAvailability(d.availability || [])
        }
      } catch (err) {
        console.error('Error loading reservation page:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [slug])

  // Real synced slots for the selected date (from FareHarbor/Peak/Airbnb sync
  // or a business's own manual setup) — falls back to the generic dinner
  // window when the business hasn't got real slot data for this date yet.
  const slotsForDate = useMemo(
    () => availability.filter(a => a.availability_date === date && a.time_slot),
    [availability, date]
  )
  const hasRealSlots = slotsForDate.length > 0
  const timeOptions = hasRealSlots
    ? slotsForDate.map(s => ({
        value: s.time_slot,
        label: new Date(`2000-01-01T${s.time_slot}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        remaining: s.remaining_spots,
        full: s.status === 'full' || s.remaining_spots === 0,
      }))
    : defaultTimeOptions()

  async function handleSubmit(e) {
    e.preventDefault()
    if (!time) { setToast({ message: 'Pick a time', type: 'error' }); return }
    if (!guestName.trim()) { setToast({ message: 'Name required', type: 'error' }); return }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_BASE}/api/email-parser/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_slug: slug,
          platform: 'gcr',
          booking_type: 'restaurant',
          event_date: date,
          event_time: time,
          party_size: partySize,
          customer_name: guestName.trim(),
          status: 'pending',
          notes: [guestEmail && `Email: ${guestEmail}`, guestPhone && `Phone: ${guestPhone}`, notes].filter(Boolean).join(' · '),
        }),
      })
      if (!res.ok) throw new Error('Reservation request failed')
      const data = await res.json()
      navigate(`/confirmation/reservation/${data.log_id || 'pending'}`)
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="reserve-loading">Loading...</div>
  if (!business) return <div className="reserve-error">Business not found</div>

  const hero = business.hero_image_url || business.photos?.[0]?.image_url

  return (
    <div className="reserve-page">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />

      <button className="reserve-back" onClick={() => navigate(`/business/${slug}`)}>← Back</button>

      <div className="reserve-hero" style={hero ? { backgroundImage: `url(${hero})` } : undefined}>
        {!hero && <span className="reserve-hero-emoji">{business.icon || '🍽️'}</span>}
      </div>

      <div className="reserve-container">
        <h1>Reserve a Table</h1>
        <div className="reserve-biz-name">{business.name}</div>
        {business.address_line_1 && (
          <div className="reserve-biz-addr">📍 {business.address_line_1}{business.city ? `, ${business.city}` : ''}</div>
        )}
        {business.description && <p className="reserve-biz-desc">{business.description}</p>}

        <form onSubmit={handleSubmit} className="reserve-form">
          <section className="reserve-section">
            <h2>Party Size</h2>
            <div className="party-stepper">
              <button type="button" onClick={() => setPartySize(p => Math.max(1, p - 1))}>−</button>
              <span>{partySize} {partySize === 1 ? 'guest' : 'guests'}</span>
              <button type="button" onClick={() => setPartySize(p => Math.min(20, p + 1))}>+</button>
            </div>
          </section>

          <section className="reserve-section">
            <h2>Date</h2>
            <input
              type="date"
              value={date}
              min={todayISO()}
              onChange={e => { setDate(e.target.value); setTime(null) }}
              required
            />
          </section>

          <section className="reserve-section">
            <h2>Time</h2>
            {!hasRealSlots && (
              <p className="reserve-time-note">Showing typical hours — exact time will be confirmed by the restaurant.</p>
            )}
            <div className="time-grid">
              {timeOptions.map(t => (
                <button
                  key={t.value}
                  type="button"
                  disabled={t.full}
                  className={`time-slot ${time === t.value ? 'active' : ''} ${t.full ? 'full' : ''}`}
                  onClick={() => setTime(t.value)}
                >
                  {t.label}
                  {hasRealSlots && !t.full && t.remaining != null && <span className="time-slot-spots">{t.remaining} left</span>}
                  {t.full && <span className="time-slot-spots">Full</span>}
                </button>
              ))}
            </div>
          </section>

          <section className="reserve-section">
            <h2>Your Information</h2>
            <input type="text" placeholder="Full Name" value={guestName} onChange={e => setGuestName(e.target.value)} required />
            <input type="email" placeholder="Email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} />
            <input type="tel" placeholder="Phone" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} />
          </section>

          <section className="reserve-section">
            <h2>Special Requests (Optional)</h2>
            <textarea placeholder="Allergies, occasion, seating preference..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </section>

          <button type="submit" className="reserve-submit" disabled={submitting}>
            {submitting ? 'Sending...' : `Request Table for ${partySize}`}
          </button>
          <p className="reserve-disclaimer">
            This sends a reservation request to {business.name} — no payment is collected here.
          </p>
        </form>
      </div>
    </div>
  )
}
