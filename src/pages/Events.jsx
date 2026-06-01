import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Toast from '../components/Toast'
import PageHeader from '../components/PageHeader'
import { SkeletonCard, SkeletonGrid } from '../components/SkeletonLoader'
import { saveItem, unsaveItem } from '../services/gcrApi'
import { API_BASE } from '../config'
import './Events.css'

const CATEGORY_SECTIONS = ['Live Music', 'Karaoke', 'Other Events']
const HERO_IMAGE = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80'

export default function Events() {
  const navigate = useNavigate()
  const { userId } = useApp()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [happyHourModalOpen, setHappyHourModalOpen] = useState(false)
  const [selectedHappyHours, setSelectedHappyHours] = useState(null)
  const [toast, setToast] = useState(null)
  const [savedSlugs, setSavedSlugs] = useState(new Set())

  // Generate next 30 days for calendar
  const getCalendarDays = () => {
    const days = []
    for (let i = 0; i < 30; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      days.push(new Date(d))
    }
    return days
  }

  const calendarDays = getCalendarDays()

  // Format date for API queries
  const formatDateForAPI = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // Format date for display
  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Load events for selected date
  useEffect(() => {
    async function loadEvents() {
      try {
        setLoading(true)
        setError(null)
        const dateStr = formatDateForAPI(selectedDate)
        const res = await fetch(
          `${API_BASE}/api/gcr/entities?type=event&date=${dateStr}&limit=100`
        )
        if (res.ok) {
          const data = await res.json()
          const evts = data.entities || []
          // Sort by start time
          evts.sort((a, b) => {
            const timeA = a.start_time || '00:00'
            const timeB = b.start_time || '00:00'
            return timeA.localeCompare(timeB)
          })
          setEvents(evts)
        } else {
          setError('Failed to load events. Please try again.')
          setEvents([])
        }
      } catch (err) {
        console.error('Error loading events:', err)
        setError('Connection error. Please check your internet and try again.')
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    loadEvents()
  }, [selectedDate])

  // Group events by category
  const groupedEvents = {}
  CATEGORY_SECTIONS.forEach(cat => {
    groupedEvents[cat] = []
  })
  groupedEvents['Other Events'] = [] // Default category

  events.forEach(event => {
    const category = event.event_category || 'Other Events'
    if (CATEGORY_SECTIONS.includes(category)) {
      groupedEvents[category].push(event)
    } else {
      groupedEvents['Other Events'].push(event)
    }
  })

  const handleSave = async (event) => {
    if (!userId) {
      navigate('/auth')
      return
    }

    try {
      const slug = event.slug || event.entity_slug
      const isSaved = savedSlugs.has(slug)

      if (isSaved) {
        await unsaveItem(slug)
        setSavedSlugs(prev => {
          const next = new Set(prev)
          next.delete(slug)
          return next
        })
        setToast({ message: 'Removed from saved', type: 'info' })
      } else {
        await saveItem(slug)
        setSavedSlugs(prev => new Set(prev).add(slug))
        setToast({ message: 'Saved!', type: 'success' })
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to save', type: 'error' })
    }
  }

  const openHappyHours = (event) => {
    setSelectedHappyHours(event)
    setHappyHourModalOpen(true)
  }

  return (
    <div className="events-page">
      <PageHeader title="🎉 Events" subtitle="Live music, karaoke, and more" showBack={true} />

      {/* Hero Section */}
      <div
        className="events-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${HERO_IMAGE})`,
        }}
      >
        <div className="hero-content">
          <h1 className="hero-title">Live Events</h1>
          <p className="hero-sub">Live music, karaoke, and more happening around you</p>
        </div>
      </div>

      {/* Calendar Picker */}
      <div className="events-calendar-section">
        <div className="calendar-container">
          <h2 className="calendar-title">Select a Date</h2>
          <div className="calendar-grid">
            {calendarDays.map((day, idx) => {
              const isSelected =
                day.toDateString() === selectedDate.toDateString()
              return (
                <button
                  key={idx}
                  className={`calendar-day ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className="day-name">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="day-number">{day.getDate()}</div>
                  <div className="day-month">
                    {day.toLocaleDateString('en-US', { month: 'short' })}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Events by Category */}
      <div className="events-content">
        <h2 className="events-date-header">
          {formatDateDisplay(selectedDate)}
        </h2>

        {loading ? (
          <div className="events-skeleton">
            <SkeletonGrid count={6} />
          </div>
        ) : error ? (
          <div className="empty-state" style={{background:'rgba(239,68,68,0.1)',borderRadius:'12px'}}>
            <p style={{fontSize:'28px',marginBottom:'12px'}}>⚠️</p>
            <p style={{fontWeight:600,marginBottom:'8px'}}>Couldn't Load Events</p>
            <p style={{fontSize:'13px',color:'var(--text2)'}}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{marginTop:'12px',padding:'8px 16px',background:'var(--accent)',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}
            >
              Try Again
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <p>📭 No events scheduled for this date</p>
            <p style={{fontSize:'13px',color:'var(--text2)',marginTop:'8px'}}>Try selecting a different date</p>
          </div>
        ) : (
          <div className="events-sections">
            {CATEGORY_SECTIONS.map(category => {
              const categoryEvents = groupedEvents[category]
              if (categoryEvents.length === 0) return null

              return (
                <section key={category} className="event-category-section">
                  <h3 className="category-title">{category}</h3>
                  <div className="events-list">
                    {categoryEvents.map(event => (
                      <div key={event.slug} className="event-card">
                        {event.hero_image_url && (
                          <img
                            src={event.hero_image_url}
                            alt={event.name}
                            className="event-image"
                          />
                        )}
                        <div className="event-content">
                          <div className="event-time">
                            {event.start_time && (
                              <span className="time-badge">
                                {event.start_time}
                              </span>
                            )}
                          </div>
                          <h4 className="event-name">{event.name}</h4>
                          <p className="event-location">
                            📍 {event.location || 'Location TBA'}
                          </p>
                          <p className="event-description">
                            {event.description}
                          </p>
                          {event.price && (
                            <p className="event-price">💰 {event.price}</p>
                          )}
                          <div className="event-actions">
                            <button
                              className="event-btn primary"
                              onClick={() => navigate(`/business/${event.slug}`)}
                            >
                              View Details
                            </button>
                            <button
                              className={`event-btn secondary ${savedSlugs.has(event.slug) ? 'saved' : ''}`}
                              onClick={() => handleSave(event)}
                            >
                              {savedSlugs.has(event.slug) ? '❤️' : '🤍'} {savedSlugs.has(event.slug) ? 'Saved' : 'Save'}
                            </button>
                          </div>
                          {event.has_happy_hours && (
                            <button
                              className="happy-hours-btn"
                              onClick={() => openHappyHours(event)}
                            >
                              🍻 View Happy Hours
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      {/* Happy Hours Modal */}
      {happyHourModalOpen && selectedHappyHours && (
        <div className="modal-overlay" onClick={() => setHappyHourModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setHappyHourModalOpen(false)}
            >
              ✕
            </button>
            <h2>Happy Hours at {selectedHappyHours.name}</h2>
            <div className="happy-hours-list">
              {selectedHappyHours.happy_hours ? (
                selectedHappyHours.happy_hours.map((hh, idx) => (
                  <div key={idx} className="happy-hour-item">
                    <div className="hh-day">{hh.day}</div>
                    <div className="hh-time">{hh.start_time} - {hh.end_time}</div>
                    <div className="hh-details">{hh.specials}</div>
                  </div>
                ))
              ) : (
                <p>Happy hours information not available</p>
              )}
            </div>
            <button
              className="modal-cta"
              onClick={() => navigate(`/business/${selectedHappyHours.slug}`)}
            >
              View Full Details →
            </button>
          </div>
        </div>
      )}

      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
