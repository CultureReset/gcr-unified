import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import GCRHeader from '../components/GCRHeader'
import { API_BASE } from '../config'
import './Landing.css'

const HERO_IMG = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=80'

const CATEGORIES = [
  { key: 'restaurants',   label: 'Restaurants',      emoji: '🍽️', desc: 'Seafood, Southern, waterfront & more',         cls: 'ct-restaurants', path: '/restaurants' },
  { key: 'coffee',        label: 'Coffee & Sweets',  emoji: '☕', desc: 'Coffee shops, ice cream & bakeries',           cls: 'ct-coffee',      path: '/coffee' },
  { key: 'happy-hours',   label: 'Happy Hours',      emoji: '🍻', desc: 'Drink deals & food specials near you',         cls: 'ct-happy',       path: '/happy-hours' },
  { key: 'events',        label: 'Events',           emoji: '🎉', desc: 'Live music, concerts & festivals',             cls: 'ct-events',      path: '/events' },
  { key: 'things-to-do',  label: 'Things To Do',    emoji: '🎯', desc: 'Fishing, boat rentals, tours & fun',           cls: 'ct-thingstodo',  path: '/things-to-do' },
  { key: 'public-spots',  label: 'Public Spots',    emoji: '✨', desc: 'Parks, beaches, piers & more',                 cls: 'ct-other',       path: '/public-spots' },
  { key: 'services',      label: 'Services',         emoji: '🛠️', desc: 'Local pros, repairs & home services',         cls: 'ct-services',    path: '/services' },
  { key: 'feed',          label: 'Live Feed',        emoji: '📡', desc: 'Photos, reviews & what\'s happening',         cls: 'ct-feed',        path: '/feed' },
]

const WEATHER_ICON = { 0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️', 45:'🌫️', 48:'🌫️', 51:'🌦️', 61:'🌧️', 63:'🌧️', 65:'🌧️', 71:'🌨️', 80:'🌦️', 81:'🌦️', 95:'⛈️' }

function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return m ? `${h12}:${String(m).padStart(2,'0')} ${ap}` : `${h12} ${ap}`
}

export default function Landing() {
  const navigate = useNavigate()
  const [searchVal, setSearchVal] = useState('')
  const [weather, setWeather] = useState(null)
  const [happeningMusic, setHappeningMusic] = useState([])
  const [happeningHH, setHappeningHH] = useState([])
  const [happeningActivities, setHappeningActivities] = useState([])
  const [featured, setFeatured] = useState([])

  const doSearch = useCallback(() => {
    if (searchVal.trim()) navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`)
  }, [searchVal, navigate])

  // Weather from Open-Meteo (Gulf Shores, AL) — free, no key
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=30.246&longitude=-87.701&current=temperature_2m,apparent_temperature,precipitation,weathercode,windspeed_10m,relativehumidity_2m&daily=temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=1&timezone=America%2FChicago')
      .then(r => r.json())
      .then(d => {
        const c = d.current
        const daily = d.daily
        setWeather({
          temp: Math.round(c.temperature_2m),
          feels: Math.round(c.apparent_temperature),
          humidity: Math.round(c.relativehumidity_2m),
          wind: Math.round(c.windspeed_10m),
          code: c.weathercode,
          hi: Math.round(daily.temperature_2m_max[0]),
          lo: Math.round(daily.temperature_2m_min[0]),
        })
      })
      .catch(() => {})
  }, [])

  // Happening Tonight
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    const todayDow = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()

    fetch(`${API_BASE}/api/gcr/events`)
      .then(r => r.json())
      .then(d => {
        const evts = d.events || []
        const todayEvts = evts.filter(e => {
          const dateMatch = e.event_date === todayStr
          const recurMatch = e.recurring && (e.day_of_week || '').toLowerCase() === todayDow
          return dateMatch || recurMatch
        })
        const music = todayEvts.filter(e => {
          const s = ((e.event_name || '') + ' ' + (e.description || '')).toLowerCase()
          return s.includes('music') || s.includes('band') || s.includes('live') || s.includes('karaoke') || s.includes('dj')
        })
        setHappeningMusic(music.slice(0, 4))
      })
      .catch(() => {})

    fetch(`${API_BASE}/api/gcr/happy-hours`)
      .then(r => r.json())
      .then(d => {
        const hhs = d.happyHours || d.businesses || []
        const now = new Date()
        const curHour = now.getHours() + now.getMinutes() / 60
        const dayIdx = now.getDay()
        const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
        const todayName = dayNames[dayIdx]
        const open = hhs.filter(b => {
          const days = (b.hh_days || '').toLowerCase()
          if (!days.includes(todayName.slice(0, 3))) return false
          const start = b.hh_start_time ? parseInt(b.hh_start_time.split(':')[0]) : 0
          const end = b.hh_end_time ? parseInt(b.hh_end_time.split(':')[0]) : 23
          return curHour >= start && curHour <= end
        })
        setHappeningHH(open.slice(0, 4))
      })
      .catch(() => {})

    fetch(`${API_BASE}/api/gcr/entities?limit=500`)
      .then(r => r.json())
      .then(d => {
        const all = d.entities || []
        const activities = all.filter(e => {
          const t = (e.entity_subtype || e.entity_type || '').toLowerCase().replace(/-/g, '_')
          return ['parasailing','dolphin_cruise','boat_rental','fishing_charter','jet_ski','watersports','snorkeling','kayak_rental','tour','attraction'].includes(t)
        })
        setFeatured(
          all.filter(e => e.is_featured || (e.rating && e.rating >= 4.5 && e.hero_image_url))
            .sort((a, b) => (b.rating || 0) - (a.rating || 0))
            .slice(0, 8)
        )
        setHappeningActivities(activities.slice(0, 4))
      })
      .catch(() => {})
  }, [])

  const weatherIcon = weather ? (WEATHER_ICON[weather.code] || '🌤️') : '🌤️'
  const weatherCond = weather ? (['Clear','Mainly Clear','Partly Cloudy','Overcast','Fog','Fog','Drizzle','Rain','Rain','Heavy Rain','Snow','Showers','Showers','Thunderstorm'][weather.code] || 'Partly Cloudy') : 'Loading…'

  return (
    <div className="landing-page">
      <GCRHeader />

      {/* ── Hero ── */}
      <section className="ld-hero" style={{ backgroundImage: `url(${HERO_IMG})` }}>
        <div className="ld-hero-overlay" />
        <div className="ld-hero-content">
          <div className="ld-eyebrow">Orange Beach · Gulf Shores · Fort Morgan</div>
          <h1 className="ld-hero-title">Find Anything<br />on the Gulf Coast</h1>
          <p className="ld-hero-sub">Restaurants, happy hours, events, boat rentals, live music &amp; more</p>

          <div className="ld-search-box">
            <input
              type="text"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder='Try "crab legs", "happy hour", "boat rental", "live music"...'
            />
            <button className="ld-search-btn" onClick={doSearch}>🔍</button>
          </div>

          <div className="ld-tagline">
            Search It &nbsp;·&nbsp; Swipe It &nbsp;·&nbsp; Plan It
          </div>
        </div>
        <div className="ld-wave">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0,32 C240,0 480,48 720,32 C960,16 1200,48 1440,32 L1440,48 L0,48 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* ── Weather ── */}
      <div className="ld-weather-wrap">
        <div className="ld-weather-card">
          <div className="ld-weather-main">
            <div>
              <div className="ld-weather-label">Gulf Shores, AL</div>
              <div className="ld-weather-temp">{weather ? `${weather.temp}°` : '--°'}</div>
              <div className="ld-weather-cond">{weatherCond}</div>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="ld-weather-icon">{weatherIcon}</div>
            <div className="ld-weather-hilo">{weather ? `${weather.hi}°` : '--°'} / {weather ? `${weather.lo}°` : '--°'}</div>
          </div>
          <div className="ld-weather-details">
            <div>💧 {weather ? `${weather.humidity}%` : '--%'}</div>
            <div>💨 {weather ? `${weather.wind} mph` : '-- mph'}</div>
            <div>🌊 Feels {weather ? `${weather.feels}°` : '--°'}</div>
            <div>🏖️ Beach Open</div>
          </div>
        </div>
      </div>

      {/* ── Browse by Category ── */}
      <section className="ld-section bg-sand">
        <div className="ld-cont">
          <div className="ld-section-head">
            <div className="ld-section-label">Browse by Category</div>
            <h2 className="ld-section-title">What Are You Looking For?</h2>
            <p className="ld-section-sub">Tap a category to see everything in it</p>
          </div>
          <div className="ld-cat-grid">
            {CATEGORIES.map(cat => (
              <div key={cat.key} className="ld-cat-tile" onClick={() => navigate(cat.path)}>
                <div className={`ld-cat-tile-top ${cat.cls}`}>{cat.emoji}</div>
                <div className="ld-cat-tile-body">
                  <div className="ld-cat-tile-name">{cat.label}</div>
                  <div className="ld-cat-tile-desc">{cat.desc}</div>
                  <span className="ld-cat-tile-count">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Happening Tonight ── */}
      <section className="ld-section bg-white" style={{ paddingTop: 32, paddingBottom: 32 }}>
        <div className="ld-cont">
          <div className="ld-section-head" style={{ marginBottom: 16 }}>
            <div className="ld-section-label">Right Now</div>
            <h2 className="ld-section-title" style={{ fontSize: '1.5rem' }}>Happening Tonight</h2>
            <p className="ld-section-sub">Live music, open happy hours, daily specials & things to book now</p>
          </div>
          <div className="ld-happening-grid">
            {/* Live Music */}
            <div className="ld-hn-card" style={{ background: '#0d2137' }}>
              <div className="ld-hn-label" style={{ color: '#5dd9d4' }}>🎵 Live Music Tonight</div>
              {happeningMusic.length > 0 ? (
                <div className="ld-hn-items">
                  {happeningMusic.map((e, i) => (
                    <div key={i} className="ld-hn-item" onClick={() => e.entity_slug && navigate(`/business/${e.entity_slug}`)}>
                      <strong>{e.event_name}</strong>
                      {e.entity_name && <span> · {e.entity_name}</span>}
                      {e.start_time && <span> · {fmt12(e.start_time)}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ld-hn-empty">Check /events for tonight's lineup</div>
              )}
              <button className="ld-hn-link" onClick={() => navigate('/events')}>See all tonight →</button>
            </div>

            {/* Happy Hours */}
            <div className="ld-hn-card" style={{ background: 'linear-gradient(135deg,#0b7a75,#065f5b)' }}>
              <div className="ld-hn-label" style={{ color: '#a7f3d0' }}>🍻 Happy Hours Open Now</div>
              {happeningHH.length > 0 ? (
                <div className="ld-hn-items">
                  {happeningHH.map((b, i) => (
                    <div key={i} className="ld-hn-item" onClick={() => b.slug && navigate(`/business/${b.slug}`)}>
                      <strong>{b.name || b.entity_name}</strong>
                      {b.hh_start_time && <span> · until {fmt12(b.hh_end_time)}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ld-hn-empty">Loading happy hours…</div>
              )}
              <button className="ld-hn-link" onClick={() => navigate('/happy-hours')}>See all happy hours →</button>
            </div>

            {/* Today's Specials */}
            <div className="ld-hn-card" style={{ background: 'linear-gradient(135deg,#7c3f00,#c9831f)' }}>
              <div className="ld-hn-label" style={{ color: '#fde68a' }}>🏷️ Today's Specials</div>
              <div className="ld-hn-items">
                <div className="ld-hn-item">
                  <strong>Fresh Gulf Catch</strong><span> · Catch of the Day at area restaurants</span>
                </div>
                <div className="ld-hn-item">
                  <strong>Daily Lunch Specials</strong><span> · Multiple locations — tap to explore</span>
                </div>
              </div>
              <button className="ld-hn-link" onClick={() => navigate('/restaurants')}>Browse restaurants →</button>
            </div>

            {/* Book Now */}
            <div className="ld-hn-card" style={{ background: 'linear-gradient(135deg,#1a3a5c,#1a6496)' }}>
              <div className="ld-hn-label" style={{ color: '#93c5fd' }}>🎯 Book Now</div>
              {happeningActivities.length > 0 ? (
                <div className="ld-hn-items">
                  {happeningActivities.map((b, i) => (
                    <div key={i} className="ld-hn-item" onClick={() => b.slug && navigate(`/business/${b.slug}`)}>
                      <strong>{b.name || b.entity_name}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="ld-hn-empty">Boat rentals, fishing charters & more</div>
              )}
              <button className="ld-hn-link" onClick={() => navigate('/things-to-do')}>See all activities →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured This Week ── */}
      {featured.length > 0 && (
        <section className="ld-section bg-white">
          <div className="ld-cont">
            <div className="ld-section-head" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div className="ld-section-label">Handpicked</div>
                <h2 className="ld-section-title">Featured This Week</h2>
              </div>
              <button className="ld-see-all" onClick={() => navigate('/restaurants')}>See All →</button>
            </div>
            <div className="ld-featured-scroll-wrap">
              <div className="ld-featured-scroll">
                {featured.map((biz, i) => {
                  const heroImg = biz.hero_image_url || biz.cover_url || ''
                  const cat = (biz.entity_subtype || biz.category || '').replace(/[_-]/g, ' ')
                  return (
                    <div key={biz.id || i} className="ld-feat-card" onClick={() => biz.slug && navigate(`/business/${biz.slug}`)}>
                      <div
                        className="ld-feat-card-top"
                        style={heroImg ? { backgroundImage: `url(${heroImg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                      >
                        <span className="ld-feat-icon">{biz.icon || '🏪'}</span>
                        <span className="ld-feat-badge">★ {biz.rating ? Number(biz.rating).toFixed(1) : 'New'}</span>
                      </div>
                      <div className="ld-feat-card-body">
                        <div className="ld-feat-card-name">{biz.name || biz.entity_name || ''}</div>
                        <div className="ld-feat-card-cat">{cat}</div>
                        <div className="ld-feat-card-desc">{biz.subtitle || biz.tagline || biz.description || ''}</div>
                        <div className="ld-feat-card-meta">
                          <span>{biz.city || biz.address_line_1 || ''}</span>
                          {biz.rating && <span className="ld-feat-rating">★ {Number(biz.rating).toFixed(1)}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Entertainment Districts ── */}
      <section className="ld-section bg-white">
        <div className="ld-cont">
          <div className="ld-section-head">
            <div className="ld-section-label">Location Guides</div>
            <h2 className="ld-section-title">Entertainment Districts</h2>
            <p className="ld-section-sub">Everything at The Wharf and OWA — all in one place</p>
          </div>
          <div className="ld-districts-grid">
            <div className="ld-district-card" style={{ background: 'linear-gradient(135deg,#0d2137,#0b7a75)' }}
              onClick={() => navigate('/search?q=The+Wharf')}>
              <div className="ld-district-emoji">⚓</div>
              <div className="ld-district-body">
                <div className="ld-district-name">The Wharf</div>
                <div className="ld-district-desc">Orange Beach's waterfront marina district — dining, shops, concerts &amp; boat tours</div>
                <span className="ld-district-link">Explore The Wharf →</span>
              </div>
            </div>
            <div className="ld-district-card" style={{ background: 'linear-gradient(135deg,#2e4057,#6c3483)' }}
              onClick={() => navigate('/search?q=OWA')}>
              <div className="ld-district-emoji">🎢</div>
              <div className="ld-district-body">
                <div className="ld-district-name">OWA</div>
                <div className="ld-district-desc">Theme parks, restaurants, shops &amp; live entertainment — minutes from the beach</div>
                <span className="ld-district-link">Explore OWA →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trip CTA ── */}
      <section className="ld-section bg-navy">
        <div className="ld-cont">
          <div className="ld-trip-cta">
            <div className="ld-trip-text">
              <h2>Planning Your Gulf Coast Trip?</h2>
              <p>Swipe through businesses, save your favorites, and build a day-by-day itinerary. One app, the whole trip.</p>
              <div className="ld-trip-btns">
                <button className="ld-btn-white" onClick={() => navigate('/swipe/restaurants')}>Start Swiping →</button>
                <button className="ld-btn-ghost" onClick={() => navigate('/itinerary')}>My Itinerary</button>
              </div>
            </div>
            <div className="ld-trip-emoji">🏖️</div>
          </div>
        </div>
      </section>

      {/* ── Claim CTA ── */}
      <section className="ld-claim">
        <h3>Own a Business on the Gulf Coast?</h3>
        <p>Claim your free listing and get in front of thousands of tourists every week.</p>
        <button className="ld-claim-btn" onClick={() => navigate('/auth')}>Claim Your Business Free</button>
      </section>

      {/* ── Footer ── */}
      <footer className="ld-footer">
        <div className="ld-cont">
          <div className="ld-footer-grid">
            <div>
              <div className="ld-footer-brand">GULF<span>COAST</span>RADAR</div>
              <p>The local guide for Orange Beach, Gulf Shores &amp; the Alabama Gulf Coast.</p>
            </div>
            <div>
              <div className="ld-footer-col-title">Explore</div>
              <div className="ld-footer-links">
                <button onClick={() => navigate('/restaurants')}>Restaurants</button>
                <button onClick={() => navigate('/things-to-do')}>Things To Do</button>
                <button onClick={() => navigate('/events')}>Events</button>
                <button onClick={() => navigate('/happy-hours')}>Happy Hours</button>
              </div>
            </div>
            <div>
              <div className="ld-footer-col-title">Locations</div>
              <div className="ld-footer-links">
                <button onClick={() => navigate('/search?q=The+Wharf')}>The Wharf</button>
                <button onClick={() => navigate('/search?q=OWA')}>OWA</button>
                <button onClick={() => navigate('/search')}>Search</button>
              </div>
            </div>
            <div>
              <div className="ld-footer-col-title">For Businesses</div>
              <div className="ld-footer-links">
                <button onClick={() => navigate('/auth')}>Claim Listing</button>
              </div>
            </div>
          </div>
          <div className="ld-footer-bottom">
            <span>© 2026 Gulf Coast Radar · Orange Beach · Gulf Shores, AL</span>
            <span>Powered by <strong>CyberCheck</strong></span>
          </div>
        </div>
      </footer>
    </div>
  )
}
