import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import GCRHeader from '../components/GCRHeader'
import { API_BASE } from '../config'
import './Landing.css'

const HERO_IMG = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&q=80'
const SUPABASE_URL = 'https://mkepugvdlktfsossumox.supabase.co/storage/v1/object/public/entity-photos'

const WX_ICON  = { 0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',61:'🌧️',63:'🌧️',65:'🌧️',71:'🌨️',80:'🌦️',81:'🌦️',95:'⛈️' }
const WX_LABEL = { 0:'Clear',1:'Mostly Clear',2:'Partly Cloudy',3:'Overcast',45:'Foggy',61:'Light Rain',63:'Rain',80:'Showers',95:'Thunderstorms' }

const CATEGORIES = [
  { emoji:'🍽️', label:'Restaurants',   path:'/restaurants' },
  { emoji:'🍻', label:'Happy Hours',   path:'/happy-hours' },
  { emoji:'🎸', label:'Live Music',    path:'/events' },
  { emoji:'🎣', label:'Charters',      path:'/things-to-do' },
  { emoji:'🌊', label:'Water Fun',     path:'/things-to-do' },
  { emoji:'☕', label:'Coffee',        path:'/coffee' },
  { emoji:'🛍️', label:'Shopping',     path:'/shopping' },
  { emoji:'🏖️', label:'Stays',        path:'/stays' },
]

function imgUrl(url, slug) {
  if (!url) return null
  if (url.startsWith('http')) return url
  if (url.startsWith('/photos/') && slug) return `${SUPABASE_URL}/${slug}/photo_01.jpg`
  return null
}

function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2,'0') : ''} ${h >= 12 ? 'PM' : 'AM'}`
}

// ─── Horizontal scroll rail ───────────────────────────────────────────
function Rail({ children, id }) {
  const ref = useRef()
  const scroll = () => ref.current?.scrollBy({ left: 260, behavior: 'smooth' })
  return (
    <div className="hn-rail-wrap">
      <div className="hn-rail" id={id} ref={ref}>{children}</div>
      <button className="hn-next" onClick={scroll} aria-label="Scroll">›</button>
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────
function SectionHead({ eyebrow, title, sub, path, navigate }) {
  return (
    <div className="hn-sec-head">
      <div>
        <p className="hn-eyebrow">{eyebrow}</p>
        <h2 className="hn-h2">{title}</h2>
        {sub && <p className="hn-sec-sub">{sub}</p>}
      </div>
      {path && (
        <button className="hn-view-all" onClick={() => navigate(path)}>View All →</button>
      )}
    </div>
  )
}

// ─── Business card (tall, full-bleed photo) ───────────────────────────
function BizCard({ item, badge, badgeColor, sub, onClick }) {
  const photo = imgUrl(item.hero_image_url, item.slug) || imgUrl(item.image_url, item.entity_slug)
  return (
    <article className="hn-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="hn-card-img" style={photo ? { backgroundImage:`url(${photo})` } : {}} />
      <div className="hn-card-overlay" />
      <div className="hn-card-body">
        <div className="hn-card-top">
          <span className="hn-emoji-icon">{item.icon || item.emoji || '📍'}</span>
          {badge && <span className={`hn-badge hn-badge-${badgeColor || 'teal'}`}>{badge}</span>}
        </div>
        <div className="hn-card-bottom">
          <h3 className="hn-card-name">{item.name || item.entity_name || item.event_name}</h3>
          {sub && <p className="hn-card-sub">{sub}</p>}
          <div className="hn-card-meta">
            {item.city && <span>📍 {item.city}</span>}
            {item.rating && <span>⭐ {item.rating}</span>}
          </div>
          <div className="hn-card-actions">
            <button className="hn-card-btn-primary">View Profile</button>
            <button className="hn-card-btn-save" aria-label="Save">♡</button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── Mini category pill card ──────────────────────────────────────────
function MiniCard({ emoji, label, onClick }) {
  return (
    <button className="hn-mini-card" onClick={onClick}>
      <span className="hn-mini-icon">{emoji}</span>
      <span className="hn-mini-label">{label}</span>
    </button>
  )
}

// ─── Happy Hour card (special layout) ────────────────────────────────
function HHCard({ item, onClick }) {
  const photo = imgUrl(item.hero_image_url, item.slug)
  return (
    <article className="hn-card hn-hh-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="hn-card-img" style={photo ? { backgroundImage:`url(${photo})` } : {}} />
      <div className="hn-card-overlay" />
      <div className="hn-card-body">
        <div className="hn-card-top">
          <span className="hn-emoji-icon">🍻</span>
          <span className="hn-badge hn-badge-yellow">Happy Hour</span>
        </div>
        <div className="hn-card-bottom">
          <h3 className="hn-card-name">{item.name}</h3>
          <p className="hn-card-sub">{item.hh_description?.slice(0,80)}{item.hh_description?.length > 80 ? '…' : ''}</p>
          <div className="hn-card-meta">
            {item.city && <span>📍 {item.city}</span>}
            <span>🕐 Until {fmt12(item.hh_end)}</span>
          </div>
          <div className="hn-card-actions">
            <button className="hn-card-btn-primary">View Details</button>
            <button className="hn-card-btn-save" aria-label="Save">♡</button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── Live music card ──────────────────────────────────────────────────
function MusicCard({ item, onClick }) {
  const photo = imgUrl(item.image_url, null) || imgUrl(item.entity?.hero_image_url, item.entity_slug)
  return (
    <article className="hn-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="hn-card-img" style={photo ? { backgroundImage:`url(${photo})` } : {}} />
      <div className="hn-card-overlay" />
      <div className="hn-card-body">
        <div className="hn-card-top">
          <span className="hn-emoji-icon">🎸</span>
          <span className="hn-badge hn-badge-purple">Live Tonight</span>
        </div>
        <div className="hn-card-bottom">
          <h3 className="hn-card-name">{item.artist_name || item.event_name}</h3>
          <p className="hn-card-sub">@ {item.entity_name || item.entity?.name}</p>
          <div className="hn-card-meta">
            {item.entity?.city && <span>📍 {item.entity.city}</span>}
            {item.start_time && <span>🕐 {fmt12(item.start_time)}</span>}
            {item.cover_charge && <span>🎟️ ${item.cover_charge}</span>}
            {!item.cover_charge && <span>🎟️ Free</span>}
          </div>
          <div className="hn-card-actions">
            <button className="hn-card-btn-primary">See Show</button>
            <button className="hn-card-btn-save" aria-label="Save">♡</button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── Activity card ────────────────────────────────────────────────────
function ActivityCard({ item, onClick }) {
  const photo = imgUrl(item.hero_image_url, item.slug)
  const subtype = (item.entity_subtype || '').replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <article className="hn-card" onClick={onClick} role="button" tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}>
      <div className="hn-card-img" style={photo ? { backgroundImage:`url(${photo})` } : {}} />
      <div className="hn-card-overlay" />
      <div className="hn-card-body">
        <div className="hn-card-top">
          <span className="hn-emoji-icon">🌊</span>
          {subtype && <span className="hn-badge hn-badge-teal">{subtype.slice(0,18)}</span>}
        </div>
        <div className="hn-card-bottom">
          <h3 className="hn-card-name">{item.name}</h3>
          <div className="hn-card-meta">
            {item.city && <span>📍 {item.city}</span>}
            {item.price_from && <span>💰 From ${item.price_from}</span>}
            {item.duration_text && <span>⏱ {item.duration_text}</span>}
            {item.rating && <span>⭐ {item.rating}</span>}
          </div>
          <div className="hn-card-actions">
            <button className="hn-card-btn-primary">Book Now</button>
            <button className="hn-card-btn-save" aria-label="Save">♡</button>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── Empty rail placeholder ───────────────────────────────────────────
function EmptyCard({ message }) {
  return (
    <div className="hn-empty-card">
      <span>{message}</span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
export default function Landing() {
  const navigate = useNavigate()
  const [searchVal, setSearchVal]     = useState('')
  const [weather, setWeather]         = useState(null)
  const [showLoyalty, setShowLoyalty] = useState(false)
  const [feed, setFeed]               = useState(null)
  const [restaurants, setRestaurants] = useState([])
  const [activities, setActivities]   = useState([])
  const [loading, setLoading]         = useState(true)

  const doSearch = useCallback(() => {
    if (searchVal.trim()) navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`)
  }, [searchVal, navigate])

  // Weather
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=30.246&longitude=-87.701&current=temperature_2m,apparent_temperature,weathercode,windspeed_10m,relativehumidity_2m&temperature_unit=fahrenheit&wind_speed_unit=mph&forecast_days=1&timezone=America%2FChicago')
      .then(r => r.json())
      .then(d => {
        const c = d.current
        setWeather({ temp: Math.round(c.temperature_2m), feels: Math.round(c.apparent_temperature), wind: Math.round(c.windspeed_10m), code: c.weathercode })
      }).catch(() => {})
  }, [])

  // Home feed (happy hours, live music, events)
  useEffect(() => {
    fetch(`${API_BASE}/api/gcr/home-feed`)
      .then(r => r.json())
      .then(d => setFeed(d))
      .catch(() => setFeed({}))
  }, [])

  // Restaurants rail
  useEffect(() => {
    fetch(`${API_BASE}/api/gcr/entities?type=restaurants&limit=50`)
      .then(r => r.json())
      .then(d => {
        const all = d.entities || []
        // sort by rating desc, prefer those with photos
        const sorted = all
          .filter(e => e.hero_image_url)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        setRestaurants(sorted.slice(0, 12))
      })
      .catch(() => {})
  }, [])

  // Activities / things to do rail
  useEffect(() => {
    fetch(`${API_BASE}/api/gcr/entities?type=things-to-do&limit=50`)
      .then(r => r.json())
      .then(d => {
        const all = d.entities || []
        const sorted = all
          .filter(e => e.hero_image_url && e.city && ['Gulf Shores','Orange Beach'].includes(e.city))
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        setActivities(sorted.length > 0 ? sorted.slice(0, 12) : all.filter(e => e.hero_image_url).slice(0, 12))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const wxIcon = weather ? (WX_ICON[weather.code] || '🌤️') : '🌤️'
  const wxLabel = weather ? (WX_LABEL[weather.code] || 'Partly Cloudy') : '...'

  const happyHours = feed?.happyHours || []
  const liveMusic  = feed?.liveMusic  || []
  const events     = feed?.events     || []
  // Combine live music + events, dedupe by id
  const allMusic = [...liveMusic, ...events.filter(e => !liveMusic.find(m => m.id === e.id))].slice(0, 10)

  return (
    <div className="hn-page">
      <GCRHeader />

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="hn-hero" style={{ backgroundImage: `url(${HERO_IMG})` }}>
        <div className="hn-hero-overlay" />
        <div className="hn-hero-content">

          {/* Weather inline */}
          <div className="hn-wx-bar">
            <span>{wxIcon} Gulf Shores</span>
            <span className="hn-wx-temp">{weather ? `${weather.temp}°F` : '...'}</span>
            <span className="hn-wx-cond">{wxLabel}</span>
            <span className="hn-wx-beach">🏖️ Beach Open</span>
          </div>

          <h1 className="hn-hero-h1">Everything<br/>on the<br/><span className="hn-teal">Gulf Coast</span></h1>

          {/* Search */}
          <div className="hn-search">
            <span className="hn-search-icon">🔍</span>
            <input
              className="hn-search-input"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && doSearch()}
              placeholder='Try "crab legs", "boat rental", "live music"...'
            />
            <button className="hn-search-btn" onClick={doSearch}>Search</button>
          </div>

          {/* Two action pills */}
          <div className="hn-hero-pills">
            <button className="hn-pill-gold" onClick={() => setShowLoyalty(true)}>📲 Get Deals & Alerts</button>
            <button className="hn-pill-ghost" onClick={() => navigate('/events')}>📅 Master Calendar</button>
          </div>
        </div>

        {/* Wave */}
        <div className="hn-wave">
          <svg viewBox="0 0 1440 52" preserveAspectRatio="none">
            <path d="M0,32 C360,0 720,52 1080,28 C1260,16 1380,44 1440,32 L1440,52 L0,52Z" fill="#071827"/>
          </svg>
        </div>
      </section>

      {/* ── BODY ──────────────────────────────────────────────── */}
      <main className="hn-main">

        {/* Category mini-pills */}
        <section className="hn-cats">
          <Rail id="cat-rail">
            {CATEGORIES.map(c => (
              <MiniCard key={c.label} emoji={c.emoji} label={c.label} onClick={() => navigate(c.path)} />
            ))}
          </Rail>
        </section>

        {/* ── HAPPY HOURS ─────────────────────────────────────── */}
        <section className="hn-sec">
          <SectionHead
            eyebrow="Happening Now"
            title="🍻 Happy Hours"
            sub={happyHours.length > 0 ? `${happyHours.length} deals active right now` : 'Deals update throughout the day'}
            path="/happy-hours"
            navigate={navigate}
          />
          <Rail id="hh-rail">
            {happyHours.length > 0
              ? happyHours.map(item => (
                  <HHCard key={item.slug} item={item} onClick={() => navigate(`/business/${item.slug}`)} />
                ))
              : <EmptyCard message="🍺 Check back — happy hours load daily" />
            }
          </Rail>
        </section>

        {/* ── LIVE MUSIC ──────────────────────────────────────── */}
        <section className="hn-sec">
          <SectionHead
            eyebrow="Tonight"
            title="🎸 Live Music"
            sub="Artists performing on the Gulf Coast"
            path="/events"
            navigate={navigate}
          />
          <Rail id="music-rail">
            {allMusic.length > 0
              ? allMusic.map(item => (
                  <MusicCard key={item.id} item={item} onClick={() => navigate(`/business/${item.entity_slug}`)} />
                ))
              : <EmptyCard message="🎵 Live music events load daily" />
            }
          </Rail>
        </section>

        {/* ── THINGS TO DO ────────────────────────────────────── */}
        <section className="hn-sec">
          <SectionHead
            eyebrow="Get Outside"
            title="🌊 Things To Do"
            sub="Charters, boat rentals, parasailing & more"
            path="/things-to-do"
            navigate={navigate}
          />
          <Rail id="activity-rail">
            {activities.length > 0
              ? activities.filter(a => imgUrl(a.hero_image_url, a.slug)).slice(0, 10).map(item => (
                  <ActivityCard key={item.slug} item={item} onClick={() => navigate(`/business/${item.slug}`)} />
                ))
              : [1,2,3].map(i => <div key={i} className="hn-card hn-skeleton" />)
            }
          </Rail>
        </section>

        {/* ── RESTAURANTS ─────────────────────────────────────── */}
        <section className="hn-sec">
          <SectionHead
            eyebrow="Eat & Drink"
            title="🍽️ Restaurants"
            sub="Seafood, Southern cooking & waterfront dining"
            path="/restaurants"
            navigate={navigate}
          />
          <Rail id="restaurant-rail">
            {restaurants.length > 0
              ? restaurants.filter(r => imgUrl(r.hero_image_url, r.slug)).slice(0, 10).map(item => (
                  <BizCard
                    key={item.slug}
                    item={item}
                    badge={item.price_range || 'Dining'}
                    badgeColor="orange"
                    sub={item.entity_subtype?.replace(/_/g,' ') || item.city}
                    onClick={() => navigate(`/business/${item.slug}`)}
                  />
                ))
              : [1,2,3].map(i => <div key={i} className="hn-card hn-skeleton" />)
            }
          </Rail>
        </section>

        {/* ── STAYS ───────────────────────────────────────────── */}
        <section className="hn-sec hn-sec-light">
          <SectionHead
            eyebrow="Where To Stay"
            title="🏖️ Condos & Rentals"
            sub="Beachfront condos, vacation homes & resorts"
            path="/stays"
            navigate={navigate}
          />
          <Rail id="stay-rail">
            {[
              { slug:'turquoise-place', name:'Turquoise Place', city:'Orange Beach', entity_subtype:'Condo Resort', rating:'4.8', hero_image_url:`${SUPABASE_URL}/turquoise-place/photo_01.jpg`, icon:'🌊' },
              { slug:'phoenix-west', name:'Phoenix West', city:'Orange Beach', entity_subtype:'Condo', rating:'4.7', hero_image_url:`${SUPABASE_URL}/phoenix-west/photo_01.jpg`, icon:'🏢' },
              { slug:'caribe-resort', name:'Caribe Resort', city:'Orange Beach', entity_subtype:'Resort', rating:'4.6', hero_image_url:`${SUPABASE_URL}/caribe-resort/photo_01.jpg`, icon:'🏖️' },
            ].map(item => (
              <BizCard key={item.slug} item={item} badge={item.entity_subtype} badgeColor="blue" sub={item.city} onClick={() => navigate(`/business/${item.slug}`)} />
            ))}
          </Rail>
        </section>

        {/* ── SWIPE CTA ───────────────────────────────────────── */}
        <section className="hn-swipe-cta">
          <div className="hn-swipe-inner">
            <div>
              <h2>Not sure where to go?</h2>
              <p>Swipe through restaurants, activities & more — Tinder-style. Build your trip in seconds.</p>
            </div>
            <button className="hn-pill-gold" onClick={() => navigate('/swipe/restaurants')}>
              👆 Start Swiping
            </button>
          </div>
        </section>

      </main>

      {/* ── SMS MODAL ─────────────────────────────────────────── */}
      {showLoyalty && (
        <div className="ld-loyalty-overlay" onClick={() => setShowLoyalty(false)}>
          <div className="ld-loyalty-modal" onClick={e => e.stopPropagation()}>
            <button className="ld-loyalty-close" onClick={() => setShowLoyalty(false)}>✕</button>
            <div style={{ fontSize:'2.5rem', marginBottom:'.5rem' }}>📲</div>
            <h2 style={{ fontSize:'1.4rem', fontWeight:900, marginBottom:'.5rem', color:'#1a1a1a' }}>Get Gulf Coast Deals</h2>
            <p style={{ fontSize:'.92rem', color:'#555', marginBottom:'1.25rem', lineHeight:1.5 }}>
              Text <strong>BEACH</strong> to get exclusive promos, happy hour alerts &amp; last-minute deals sent to your phone.
            </p>
            <a className="ld-loyalty-sms" href="sms:2519777770?body=BEACH">
              📱 Text BEACH to Sign Up
            </a>
            <p style={{ fontSize:'.78rem', color:'#aaa', marginTop:'.85rem' }}>
              Opens your Messages app pre-filled. Just hit send.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
