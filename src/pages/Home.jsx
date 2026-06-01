import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Toast from '../components/Toast'
import { CATEGORIES } from '../data/mockBusinesses'
import { fetchBusinesses, fetchLiveNow, saveItem, unsaveItem } from '../services/gcrApi'
import * as locationService from '../services/locationService'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()
  const { tourist, savedPlaces, itinerary, seenSlugs, locationSharingEnabled, enableLocationSharing, userId } = useApp()
  const [businesses, setBusinesses] = useState([])
  const [liveNow, setLiveNow] = useState([])
  const [showLocationBanner, setShowLocationBanner] = useState(false)
  const [requestingPermission, setRequestingPermission] = useState(false)
  const [toast, setToast] = useState(null)
  const [savedSlugs, setSavedSlugs] = useState(new Set())

  useEffect(() => {
    let cancelled = false
    fetchBusinesses()
      .then(d => { if (!cancelled) setBusinesses(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const uid = tourist?.id || null
    fetchLiveNow(uid)
      .then(d => { if (!cancelled) setLiveNow(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [tourist?.id])

  useEffect(() => {
    // Show location banner after user has swiped 5+ times and hasn't enabled location sharing
    if (seenSlugs.length >= 5 && !locationSharingEnabled && userId) {
      setShowLocationBanner(true)
    }
  }, [seenSlugs.length, locationSharingEnabled, userId])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const handleEnableLocation = async () => {
    setRequestingPermission(true)
    try {
      // Request browser permission
      const permission = await locationService.requestLocationPermission()
      if (permission) {
        // User granted permission, enable location sharing
        await enableLocationSharing({
          geofence_radius_miles: 1.0,
          sms_frequency: 'once_per_day',
          sms_categories: ['food', 'nightlife', 'activities', 'stay']
        })
        setShowLocationBanner(false)
      }
    } catch (e) {
      console.error('Error requesting location:', e)
    } finally {
      setRequestingPermission(false)
    }
  }

  const handleSaveItem = async (e, slug) => {
    e.stopPropagation()
    if (!userId) {
      navigate('/auth')
      return
    }

    try {
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

  return (
    <div className="home-page page safe-top safe-bottom">
      <div className="home-header">
        <div className="home-greeting">
          <h2>{greeting()}{tourist?.name ? `, ${tourist.name}` : ''}! 👋</h2>
          <p className="home-dest">
            📍 {tourist?.destination || 'Gulf Coast'}
            {tourist?.arrival && ` · ${new Date(tourist.arrival).toLocaleDateString('en-US', {month:'short', day:'numeric'})}`}
            {tourist?.departure && ` – ${new Date(tourist.departure).toLocaleDateString('en-US', {month:'short', day:'numeric'})}`}
          </p>
        </div>
        <button className="home-avatar" onClick={() => navigate('/profile')}>
          {tourist?.name?.[0]?.toUpperCase() || '?'}
        </button>
      </div>

      {showLocationBanner && (
        <div className="stay-banner">
          <span>📍</span>
          <div>
            <div className="stay-banner-title">Get personalized nearby offers?</div>
            <div className="stay-banner-sub">We'll send SMS when you're near places you'll love</div>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button
              className="stay-banner-btn"
              onClick={() => setShowLocationBanner(false)}
              style={{background:'transparent',border:'1px solid rgba(255,255,255,.2)',padding:'6px 12px',borderRadius:'4px'}}
            >
              Not Now
            </button>
            <button
              className="stay-banner-btn"
              onClick={handleEnableLocation}
              disabled={requestingPermission}
              style={{padding:'6px 12px'}}
            >
              {requestingPermission ? 'Allow...' : 'Allow →'}
            </button>
          </div>
        </div>
      )}

      {tourist?.stay_status === 'looking' && (
        <div className="stay-banner">
          <span>🏨</span>
          <div>
            <div className="stay-banner-title">Still need a place to stay?</div>
            <div className="stay-banner-sub">We'll show hotels & condos in your deck</div>
          </div>
          <button className="stay-banner-btn" onClick={() => navigate('/swipe/hotels')}>Browse →</button>
        </div>
      )}

      <div className="home-stats">
        <div className="stat">
          <div className="stat-num">{savedPlaces.length}</div>
          <div className="stat-label">Saved</div>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <div className="stat-num">{tourist?.trip_days || '—'}</div>
          <div className="stat-label">Days</div>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <div className="stat-num">{itinerary ? itinerary.days.length : '—'}</div>
          <div className="stat-label">Days Planned</div>
        </div>
      </div>

      <button className="stay-banner" onClick={() => navigate('/groups')} style={{width:'100%',border:'none',cursor:'pointer',background:'linear-gradient(135deg,rgba(14,165,233,.15),rgba(124,106,247,.15))',borderColor:'rgba(124,106,247,.3)'}}>
        <span>👥</span>
        <div style={{flex:1,textAlign:'left'}}>
          <div className="stay-banner-title">Plan with friends</div>
          <div className="stay-banner-sub">Swipe together, see overlaps, build a shared trip</div>
        </div>
        <span className="stay-banner-btn">Open →</span>
      </button>

      {liveNow.length > 0 && (
        <>
          <h3 className="section-title">⚡ Happening Right Now</h3>
          <div className="live-row">
            {liveNow.map(b => (
              <div key={b.slug} className="live-card-wrapper">
                <button className="live-card" onClick={() => navigate(`/business/${b.slug}`)}>
                  <div className="live-card-img">
                    {b.hero_image_url
                      ? <img src={b.hero_image_url} alt={b.name} onError={e => { e.target.style.display='none' }} />
                      : <div className="live-card-img-placeholder" />
                    }
                    {b.is_match && <div className="live-match-dot">⚡</div>}
                  </div>
                  <div className="live-card-body">
                    <div className="live-card-name">{b.name}</div>
                    {b.signals?.slice(0, 2).map((sig, i) => (
                      <div key={i}>
                        <div className="live-card-signal">{sig.label}</div>
                        {sig.status && <div className="live-card-status">{sig.status}</div>}
                      </div>
                    ))}
                    {b.signals?.[0]?.detail && (
                      <div className="live-card-detail">{b.signals[0].detail}</div>
                    )}
                  </div>
                </button>
                <button
                  className={`live-card-save ${savedSlugs.has(b.slug) ? 'saved' : ''}`}
                  onClick={(e) => handleSaveItem(e, b.slug)}
                  title={savedSlugs.has(b.slug) ? 'Remove from saved' : 'Save this item'}
                >
                  {savedSlugs.has(b.slug) ? '❤️' : '🤍'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="section-title">What do you want to explore?</h3>

      <div className="category-grid">
        {CATEGORIES.map(cat => {
          const count = cat.id === 'all'
            ? businesses.length
            : businesses.filter(b => b.category === cat.id).length
          return (
            <button
              key={cat.id}
              className="category-card"
              style={{ '--cat-color': cat.color }}
              onClick={() => navigate(`/swipe/${cat.id}`)}
            >
              <span className="cat-emoji">{cat.emoji}</span>
              <div className="cat-label">{cat.label}</div>
              <div className="cat-count">{count} spots</div>
              <div className="cat-glow" />
            </button>
          )
        })}
      </div>

      {savedPlaces.length >= 3 && (
        <div className="build-banner">
          <div>
            <div className="build-title">Ready to plan your trip?</div>
            <div className="build-sub">You have {savedPlaces.length} places saved</div>
          </div>
          <button className="btn-primary build-btn" onClick={() => navigate('/building')}>
            Build My Itinerary ✨
          </button>
        </div>
      )}

      {businesses.length > 0 && (
        <>
          <h3 className="section-title">Trending on the Gulf Coast</h3>
          <div className="trending-row">
            {businesses.slice(0,3).map(b => (
              <button key={b.id} className="trending-card" onClick={() => navigate(`/business/${b.slug}`)}>
                {b.hero_image_url && <img src={b.hero_image_url} alt={b.name} />}
                <div className="trending-info">
                  <div className="trending-name">{b.name}</div>
                  <div className="trending-meta">
                    {b.rating ? `⭐ ${b.rating}` : ''}
                    {b.rating && b.price_range ? ' · ' : ''}
                    {b.price_range || ''}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
