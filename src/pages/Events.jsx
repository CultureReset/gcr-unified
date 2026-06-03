import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../config'
import './Events.css'

const FALLBACK_EVENT_IMG = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80'

function fmt12(timeStr) {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return m ? `${h12}:${String(m).padStart(2, '0')} ${ap}` : `${h12}:00 ${ap}`
}

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function inferEventType(name = '', desc = '') {
  const s = (name + ' ' + desc).toLowerCase()
  if (s.includes('karaoke')) return 'Karaoke'
  if (s.includes('trivia')) return 'Trivia'
  if (s.includes('open mic')) return 'Open Mic'
  if (s.includes('bingo')) return 'Bingo'
  if (s.includes('dj') || s.includes(' dj')) return 'DJ Night'
  if (s.includes('comedy')) return 'Comedy'
  if (s.includes('music') || s.includes('band') || s.includes('concert') || s.includes('live')) return 'Live Music'
  return 'Event'
}

const EVENT_TYPE_EMOJI = {
  'Live Music': '🎸',
  'Karaoke': '🎤',
  'Trivia': '🎯',
  'Open Mic': '🎙️',
  'Bingo': '🎱',
  'DJ Night': '🎧',
  'Comedy': '😂',
  'Event': '🎉',
}

const TYPE_FILTERS = ['All', 'Live Music', 'Karaoke', 'Trivia', 'Open Mic', 'DJ Night']

function getDateFilters() {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // This weekend = next Fri/Sat/Sun
  const day = today.getDay()
  const daysToFri = (5 - day + 7) % 7 || 7
  const fri = new Date(today); fri.setDate(today.getDate() + daysToFri)
  const sat = new Date(fri); sat.setDate(fri.getDate() + 1)
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2)
  const weekendDates = [fri, sat, sun].map(d => d.toISOString().split('T')[0])

  return { todayStr, tomorrowStr, weekendDates }
}

function EventCard({ event, navigate }) {
  const img = event.image_url || event.hero_image_url || FALLBACK_EVENT_IMG
  const eventType = inferEventType(event.event_name, event.description)
  const typeEmoji = EVENT_TYPE_EMOJI[eventType] || '🎉'
  const dateLabel = fmtDate(event.event_date)
  const timeLabel = fmt12(event.start_time)
  const endLabel = event.end_time ? fmt12(event.end_time) : ''

  return (
    <div className="ev-card">
      {/* Artist / Event Image */}
      <div className="ev-card-img" style={{ backgroundImage: `url(${img})` }}>
        <div className="ev-type-badge">{typeEmoji} {eventType}</div>
        {(dateLabel || timeLabel) && (
          <div className="ev-datetime-badge">
            {dateLabel}{timeLabel ? ` · ${timeLabel}` : ''}{endLabel ? ` – ${endLabel}` : ''}
          </div>
        )}
      </div>

      {/* Event Info */}
      <div className="ev-card-body">
        <div className="ev-name">{event.event_name || 'Event'}</div>
        {event.artist_name && (
          <div className="ev-artist">🎤 {event.artist_name}</div>
        )}
        {event.description && (
          <div className="ev-desc">{event.description}</div>
        )}
        {event.cover_charge != null && (
          <div className="ev-cover">
            💵 {event.cover_charge === 0 || event.cover_charge === '0' ? 'Free admission' : `$${event.cover_charge} cover`}
          </div>
        )}
      </div>

      {/* Venue Section */}
      <div className="ev-venue">
        <div className="ev-venue-label">AT THE VENUE</div>
        <div className="ev-venue-name"
          onClick={() => event.entity_slug && navigate(`/business/${event.entity_slug}`)}
          style={{ cursor: event.entity_slug ? 'pointer' : 'default' }}
        >
          {event.icon || '🏠'} {event.entity_name || 'Venue'}
        </div>
        {(event.address_line_1 || event.city) && (
          <div className="ev-venue-addr">
            📍 {[event.address_line_1, event.city].filter(Boolean).join(', ')}
          </div>
        )}
        <div className="ev-venue-actions">
          {event.entity_slug && (
            <button className="ev-btn primary" onClick={() => navigate(`/business/${event.entity_slug}`)}>
              View Venue
            </button>
          )}
          {event.address_line_1 && (
            <a
              className="ev-btn"
              href={`https://maps.google.com/?q=${encodeURIComponent([event.address_line_1, event.city, 'AL'].filter(Boolean).join(', '))}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
            >
              📍 Directions
            </a>
          )}
          {event.phone && (
            <a className="ev-btn" href={`tel:${event.phone.replace(/\D/g, '')}`} onClick={e => e.stopPropagation()}>
              📞 Call
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Events() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateFilter, setDateFilter] = useState('today')
  const [typeFilter, setTypeFilter] = useState('All')
  const [customDate, setCustomDate] = useState('')

  const { todayStr, tomorrowStr, weekendDates } = useMemo(() => getDateFilters(), [])

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_BASE}/api/gcr/events`)
        if (!res.ok) throw new Error('Failed to load events')
        const data = await res.json()
        setEvents(data.events || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = useMemo(() => {
    return events.filter(ev => {
      // Date filter
      const d = ev.event_date || ''
      const isRecurring = ev.recurring

      let dateMatch = false
      if (dateFilter === 'today') {
        dateMatch = d === todayStr || (isRecurring && ev.day_of_week && new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === (ev.day_of_week || '').toLowerCase())
      } else if (dateFilter === 'tomorrow') {
        dateMatch = d === tomorrowStr || (isRecurring && ev.day_of_week && new Date(tomorrowStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === (ev.day_of_week || '').toLowerCase())
      } else if (dateFilter === 'weekend') {
        dateMatch = weekendDates.includes(d) || isRecurring
      } else if (dateFilter === 'custom' && customDate) {
        dateMatch = d === customDate
      } else if (dateFilter === 'all') {
        dateMatch = true
      }

      // Type filter
      let typeMatch = typeFilter === 'All'
      if (!typeMatch) {
        const inferred = inferEventType(ev.event_name, ev.description)
        typeMatch = inferred === typeFilter
      }

      return dateMatch && typeMatch
    })
  }, [events, dateFilter, typeFilter, customDate, todayStr, tomorrowStr, weekendDates])

  const dateButtons = [
    { key: 'today', label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'weekend', label: 'This Weekend' },
    { key: 'all', label: 'All Events' },
    { key: 'custom', label: '📅 Pick Date' },
  ]

  return (
    <div className="events-page">

      {/* Hero */}
      <div className="ev-hero">
        <div className="ev-hero-overlay" />
        <div className="ev-hero-content">
          <h1>Events &amp; Live Music</h1>
          <p>See what's happening tonight across Orange Beach, Gulf Shores, and nearby</p>
        </div>
      </div>

      {/* Date Filter */}
      <div className="ev-filters-bar">
        <div className="ev-filter-scroll">
          {dateButtons.map(btn => (
            <button
              key={btn.key}
              className={`ev-filter-pill ${dateFilter === btn.key ? 'active' : ''}`}
              onClick={() => setDateFilter(btn.key)}
            >
              {btn.label}
            </button>
          ))}
        </div>
        {dateFilter === 'custom' && (
          <div className="ev-date-picker">
            <input
              type="date"
              value={customDate}
              min={todayStr}
              onChange={e => setCustomDate(e.target.value)}
            />
          </div>
        )}

        {/* Type Filter */}
        <div className="ev-filter-scroll" style={{ marginTop: 8 }}>
          {TYPE_FILTERS.map(t => (
            <button
              key={t}
              className={`ev-filter-chip ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {EVENT_TYPE_EMOJI[t] || ''} {t}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="ev-content">
        <div className="ev-results-header">
          {dateFilter === 'today' && <span>Today</span>}
          {dateFilter === 'tomorrow' && <span>Tomorrow</span>}
          {dateFilter === 'weekend' && <span>This Weekend</span>}
          {dateFilter === 'all' && <span>All Upcoming Events</span>}
          {dateFilter === 'custom' && customDate && <span>{fmtDate(customDate)}</span>}
          {!loading && <span className="ev-count">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>}
        </div>

        {loading ? (
          <div className="ev-loading">
            {[...Array(3)].map((_, i) => <div key={i} className="ev-skeleton" />)}
          </div>
        ) : error ? (
          <div className="ev-empty">
            <div>⚠️</div>
            <div>Couldn't load events</div>
            <button onClick={() => window.location.reload()}>Try Again</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="ev-empty">
            <div style={{ fontSize: 40 }}>🎸</div>
            <div style={{ fontWeight: 700, marginTop: 12 }}>No events found</div>
            <div style={{ fontSize: 13, color: '#8fa3b1', marginTop: 6 }}>
              {dateFilter !== 'all' ? 'Try "All Events" or a different date' : 'Check back soon — events are added regularly'}
            </div>
            {dateFilter !== 'all' && (
              <button className="ev-btn primary" style={{ marginTop: 16 }} onClick={() => setDateFilter('all')}>
                Show All Events
              </button>
            )}
          </div>
        ) : (
          <div className="ev-grid">
            {filtered.map(ev => (
              <EventCard key={ev.id} event={ev} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
