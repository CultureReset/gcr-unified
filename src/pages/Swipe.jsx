import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TinderCard from 'react-tinder-card'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/mockBusinesses'
import { fetchBusinesses, calcDistance, formatDistance, fetchPreferences, personalizeAndSort } from '../services/gcrApi'
import { API_BASE } from '../config'
import './Swipe.css'

const CAT_TABS = [
  { id: 'all',        label: 'All',        emoji: '🌟' },
  { id: 'food',       label: 'Food',       emoji: '🍽️' },
  { id: 'drinks',     label: 'Drinks',     emoji: '🍷' },
  { id: 'nightlife',  label: 'Nightlife',  emoji: '🎵' },
  { id: 'activities', label: 'Activities', emoji: '🏄' },
  { id: 'shopping',   label: 'Shopping',   emoji: '🛍️' },
  { id: 'stay',       label: 'Stay',       emoji: '🏨' },
  { id: 'events',     label: 'Events',     emoji: '🎪' },
]

const DECK_SIZE = 15

function shuffle(arr) {
  const copy = [...arr]
  for (let j = copy.length - 1; j > 0; j--) {
    const k = Math.floor(Math.random() * (j + 1));
    [copy[j], copy[k]] = [copy[k], copy[j]]
  }
  return copy
}

const TAG_COLORS = [
  { pattern: /golf|outdoor|park|hiking|biking|sport|kayak|surf|swim|paddle|snorkel|fishing|boat|sail/i, cls: 'tag-green' },
  { pattern: /happy.hour|cocktail|full.bar|open.bar/i, cls: 'tag-amber' },
  { pattern: /bar|drink|wine|beer|brewery|spirits/i, cls: 'tag-amber' },
  { pattern: /family|kid|child|toddler/i, cls: 'tag-blue' },
  { pattern: /seafood|fresh.catch|fish|shrimp|crab|oyster|lobster/i, cls: 'tag-teal' },
  { pattern: /waterfront|gulf.front|beachfront|bayfront|marina|dock|harbor/i, cls: 'tag-cyan' },
  { pattern: /popular|top.rated|local.fav|award|trending|best/i, cls: 'tag-gold' },
  { pattern: /nightlife|live.music|dj|club|lounge/i, cls: 'tag-purple' },
  { pattern: /breakfast|brunch|lunch|dinner|dining|cuisine/i, cls: 'tag-orange' },
]

function tagColor(tag) {
  for (const { pattern, cls } of TAG_COLORS) {
    if (pattern.test(tag)) return cls
  }
  return 'tag-default'
}

export default function Swipe() {
  const { category } = useParams()
  const navigate = useNavigate()
  const { addSavedPlace, removeSavedPlace, savedPlaces, addSuperLike, tourist, seenSlugs, recordSwipe, resetSeenSlugs, userLocation, requestLocation, geocodeStay } = useApp()

  const [allBusinesses, setAllBusinesses] = useState([])
  const [pool, setPool] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [deckReady, setDeckReady] = useState(false)
  const [error, setError] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const [likedCount, setLikedCount] = useState(0)
  const [view, setView] = useState('swipe')
  const [showBackTop, setShowBackTop] = useState(false)
  const [locPrompt, setLocPrompt] = useState(false)
  const [smsPrompt, setSmsPrompt] = useState(false)
  const [smsPhone, setSmsPhone] = useState('')
  const [smsSubmitting, setSmsSubmitting] = useState(false)
  const [smsDone, setSmsDone] = useState(() => !!localStorage.getItem('gcr_sms_opted'))
  const [prefMap, setPrefMap] = useState({})
  const swipeCountRef = useRef(0)
  const pageRef = useRef(null)

  const catInfo = CATEGORIES.find(c => c.id === category) || CATEGORIES[5]

  const businesses = (category === 'all'
    ? allBusinesses.filter(b => !b._isPromo) // Exclude promos from 'All' view
    : allBusinesses.filter(b => b.category === category))
    .filter(b => !seenSlugs.includes(b.slug))
    .filter(b => b.hero_image_url) // Only show businesses with images

  function closeTrip() {
    // notify parent iframe if embedded, then go back
    try { window.parent.postMessage({ type: 'tripswipe-close' }, '*') } catch {}
    window.history.back()
  }

  function scrollToTop() {
    pageRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const el = pageRef.current
    if (!el) return
    function onScroll() { setShowBackTop(el.scrollTop > 250) }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([fetchBusinesses(), fetchPreferences()])
      .then(([all, prefs]) => {
        if (cancelled) return
        setPrefMap(prefs)
        setAllBusinesses(all)
        setLoading(false)
      })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  // Show location prompt once if no location yet
  useEffect(() => {
    if (!userLocation) setLocPrompt(true)
  }, [])

  // Fetch SMS config and set up opt-in trigger
  useEffect(() => {
    if (smsDone) return
    let timer = null
    fetch(`${API_BASE}/api/admin/sms-config`)
      .then(r => r.json())
      .then(cfg => {
        if (!cfg.popup_enabled) return
        const val = parseInt(cfg.popup_value) || 5
        if (cfg.popup_trigger === 'time') {
          timer = setTimeout(() => setSmsPrompt(true), val * 60 * 1000)
        } else {
          // swipe-based: stored in swipeCountRef, checked in onSwipe
          swipeCountRef.current = -val // trigger when reaches 0
        }
      })
      .catch(() => {
        // default: show after 5 min
        timer = setTimeout(() => setSmsPrompt(true), 5 * 60 * 1000)
      })
    return () => { if (timer) clearTimeout(timer) }
  }, [smsDone])

  useEffect(() => {
    if (allBusinesses.length === 0) return
    setDeckReady(false)
    const visible = (category === 'all'
      ? allBusinesses.filter(b => !b._isPromo)
      : allBusinesses.filter(b => b.category === category))
      .filter(b => !seenSlugs.includes(b.slug))
    setPool(visible)
    // Use personalized order if we have preference data, else shuffle
    const sorted = Object.keys(prefMap).length
      ? personalizeAndSort(visible, prefMap)
      : shuffle(visible)
    setCards(sorted.slice(0, DECK_SIZE))
    setLikedCount(0)
    setDeckReady(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, allBusinesses, prefMap])

  useEffect(() => {
    if (allBusinesses.length === 0) return
    if (seenSlugs.length > 0) return
    const visible = (category === 'all'
      ? allBusinesses.filter(b => !b._isPromo)
      : allBusinesses.filter(b => b.category === category))
    setPool(visible)
    const sorted = Object.keys(prefMap).length
      ? personalizeAndSort(visible, prefMap)
      : shuffle(visible)
    setCards(sorted.slice(0, DECK_SIZE))
    setLikedCount(0)
    setDeckReady(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenSlugs])

  if (loading || !deckReady) return (
    <div className="swipe-page" style={{display:'flex',alignItems:'center',justifyContent:'center',color:'#fff'}}>
      <div>Loading…</div>
    </div>
  )
  if (error) return (
    <div className="swipe-page" style={{display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',textAlign:'center',padding:20}}>
      <div>
        <div>Could not load businesses.</div>
        <div style={{fontSize:13,color:'#aaa',marginTop:8}}>{error}</div>
        <button onClick={() => navigate('/home')} style={{marginTop:16,padding:'10px 18px'}}>Back</button>
      </div>
    </div>
  )

  function flash(action) {
    setLastAction(action)
    setTimeout(() => setLastAction(null), 800)
  }

  function refillDeck(next) {
    if (next.length < 5) {
      const shownIds = new Set(next.map(b => b.id))
      // Allow same business (slug) to appear multiple times, just not same card instance (id)
      const remaining = pool.filter(b => !shownIds.has(b.id))
      return [...remaining.slice(0, DECK_SIZE - next.length), ...next]
    }
    return next
  }

  // For sponsored cards, resolve to real business slug before saving
  function resolveReal(business) {
    if (!business._isSponsored) return business
    return { ...business, id: business._sponsorSlug, slug: business._sponsorSlug }
  }

  function onSwipe(direction, business) {
    if (direction === 'right') {
      addSavedPlace(resolveReal(business))
      setLikedCount(p => p + 1)
      flash('like')
      recordSwipe(business, 'like')
    } else {
      flash('nope')
      recordSwipe(business, 'nope')
    }
    // swipe-count based SMS trigger
    if (!smsDone && swipeCountRef.current < 0) {
      swipeCountRef.current += 1
      if (swipeCountRef.current === 0) setSmsPrompt(true)
    }
  }

  function onCardLeftScreen(business) {
    setCards(prev => refillDeck(prev.filter(b => b.id !== business.id)))
  }

  function pressLike() {
    if (cards.length === 0) return
    const top = cards[cards.length - 1]
    addSavedPlace(resolveReal(top))
    recordSwipe(top, 'like')
    setLikedCount(p => p + 1)
    setCards(prev => refillDeck(prev.slice(0, -1)))
    flash('like')
  }

  function pressNope() {
    if (cards.length === 0) return
    const top = cards[cards.length - 1]
    recordSwipe(top, 'nope')
    setCards(prev => refillDeck(prev.slice(0, -1)))
    flash('nope')
  }

  function pressSuper() {
    if (cards.length === 0) return
    const top = cards[cards.length - 1]
    addSuperLike(resolveReal(top))
    recordSwipe(top, 'super')
    setLikedCount(p => p + 1)
    setCards(prev => refillDeck(prev.slice(0, -1)))
    flash('super')
  }

  const allGone = deckReady && cards.length === 0 && pool.filter(b => !seenSlugs.includes(b.slug)).length === 0

  const tripLabel = [
    tourist?.destination?.split(',')[0],
    tourist?.arrival && new Date(tourist.arrival).toLocaleDateString('en-US', {month:'short', day:'numeric'}),
  ].filter(Boolean).join(' · ') || 'Gulf Coast'

  return (
    <div className="swipe-page page safe-top safe-bottom" ref={pageRef}>
      {/* Header */}
      <div className="swipe-header">
        <button className="back-btn-sm close-btn" onClick={closeTrip} aria-label="Close">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} width={20} height={20}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="swipe-title">
          <span>{catInfo.emoji}</span>
          <span>Swipe Your Trip</span>
        </div>
        <div className="swipe-view-toggle">
          <button className={view === 'swipe' ? 'active' : ''} onClick={() => setView('swipe')}>
            <SwipeIcon />
          </button>
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>
            <ListIcon />
          </button>
        </div>
      </div>

      {/* Location prompt */}
      {locPrompt && (
        <div className="loc-prompt">
          <span>📍 Share location for distances</span>
          <button className="loc-yes" onClick={async () => {
            setLocPrompt(false)
            const gps = await requestLocation()
            if (!gps && tourist?.hotel_name) await geocodeStay(tourist.hotel_name)
            else if (!gps && tourist?.destination) await geocodeStay(tourist.destination)
          }}>Allow</button>
          <button className="loc-no" onClick={() => setLocPrompt(false)}>✕</button>
        </div>
      )}

      {/* Category tabs */}
      <div className="cat-tabs">
        {CAT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`cat-tab ${category === tab.id ? 'active' : ''}`}
            onClick={() => navigate(`/swipe/${tab.id}`)}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="swipe-dest">
        📍 {tripLabel}
        {view === 'swipe' && (
          <span className="swipe-progress">
            {businesses.length - cards.length}/{businesses.length}
          </span>
        )}
        {view === 'list' && (
          <span className="swipe-progress">{businesses.length} places</span>
        )}
      </div>

      {/* ── SWIPE VIEW ── */}
      {view === 'swipe' && (
        <>
          <div className="swipe-hint">
            <span className="hint-nope">← NOPE</span>
            <span className="hint-like">LIKE →</span>
          </div>

          {lastAction && (
            <div className={`swipe-flash ${lastAction}`}>
              {lastAction === 'like' ? '❤️ LIKE' : lastAction === 'super' ? '⭐ MUST DO' : '✕ NOPE'}
            </div>
          )}

          <div className="cards-container">
            {allGone ? (
              <div className="all-done">
                <div className="done-emoji">🎉</div>
                <h3>You've seen them all!</h3>
                <p>You saved {likedCount} place{likedCount !== 1 ? 's' : ''} this session</p>
                <button className="btn-primary" onClick={() => navigate('/list')}>View My List →</button>
                <button className="btn-outline" onClick={resetSeenSlugs} style={{marginTop:10}}>
                  🔄 Swipe Again
                </button>
                <button className="btn-outline" onClick={() => navigate('/home')} style={{marginTop:8}}>Explore More</button>
              </div>
            ) : (
              cards.map((business, index) => (
                <TinderCard
                  key={business.id}
                  onSwipe={(dir) => onSwipe(dir, business)}
                  onCardLeftScreen={() => onCardLeftScreen(business)}
                  preventSwipe={['up', 'down']}
                  className="swipe-card-wrapper"
                >
                  {business._isPromo
                    ? <PromoCard card={business} isTop={index === cards.length - 1} onDetail={() => navigate(business.linked_slug ? `/business/${business.linked_slug}` : '#')} />
                    : business._isSponsored
                      ? <SponsoredCard business={business} isTop={index === cards.length - 1} onDetail={() => navigate(`/business/${business._sponsorSlug}`)} userLocation={userLocation} />
                      : <BusinessCard business={business} isTop={index === cards.length - 1} onDetail={() => navigate(`/business/${business.slug}`)} userLocation={userLocation} />
                  }
                </TinderCard>
              ))
            )}
          </div>

          {!allGone && (
            <div className="swipe-actions">
              <button className="action-btn nope" onClick={pressNope}>
                <span>✕</span>
                <span>NOPE</span>
              </button>
              <button className="action-btn super" onClick={pressSuper}>
                <span>⭐</span>
                <span>MUST DO</span>
              </button>
              <button className="action-btn like" onClick={pressLike}>
                <span>♥</span>
                <span>LIKE</span>
              </button>
            </div>
          )}
        </>
      )}

      {showBackTop && (
        <button className="back-to-top" onClick={scrollToTop} aria-label="Back to top">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} width={18} height={18}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}

      {/* ── SMS Opt-in Bottom Sheet ── */}
      {smsPrompt && !smsDone && (
        <div style={{position:'fixed',inset:0,zIndex:9000,display:'flex',alignItems:'flex-end',background:'rgba(0,0,0,.5)'}}
             onClick={e => { if(e.target===e.currentTarget) setSmsPrompt(false) }}>
          <div style={{width:'100%',background:'#0f172a',borderRadius:'20px 20px 0 0',padding:'28px 24px 40px',boxShadow:'0 -8px 40px rgba(0,0,0,.5)'}}>
            <div style={{width:40,height:4,background:'#334155',borderRadius:999,margin:'0 auto 20px'}}></div>
            <div style={{fontSize:24,textAlign:'center',marginBottom:8}}>📲</div>
            <h3 style={{textAlign:'center',color:'#fff',fontSize:18,fontWeight:900,margin:'0 0 6px'}}>Get deals while you're here</h3>
            <p style={{textAlign:'center',color:'rgba(255,255,255,.6)',fontSize:14,margin:'0 0 20px',lineHeight:1.5}}>
              Drop your number and we'll text you same-day specials nearby.
            </p>
            <input
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={smsPhone}
              onChange={e => setSmsPhone(e.target.value)}
              style={{width:'100%',boxSizing:'border-box',background:'#1e293b',border:'1px solid #334155',borderRadius:10,padding:'14px 16px',fontSize:16,color:'#fff',marginBottom:12}}
            />
            <button
              onClick={async () => {
                if (!smsPhone.trim()) return
                setSmsSubmitting(true)
                const token = localStorage.getItem('gcr_access_token')
                try {
                  await fetch(`${API_BASE}/api/tourist/sms-optin`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: smsPhone.trim() })
                  })
                } catch {}
                localStorage.setItem('gcr_sms_opted', '1')
                setSmsDone(true)
                setSmsPrompt(false)
                setSmsSubmitting(false)
              }}
              disabled={smsSubmitting}
              style={{width:'100%',background:'linear-gradient(135deg,#7c3aed,#a855f7)',color:'#fff',border:'none',borderRadius:10,padding:'14px',fontSize:16,fontWeight:800,cursor:'pointer',marginBottom:10}}
            >
              {smsSubmitting ? 'Saving…' : 'Yes, text me deals 🎉'}
            </button>
            <button
              onClick={() => { setSmsPrompt(false); localStorage.setItem('gcr_sms_opted','skip') ; setSmsDone(true) }}
              style={{width:'100%',background:'none',color:'rgba(255,255,255,.4)',border:'none',fontSize:13,cursor:'pointer',padding:'8px'}}
            >
              No thanks
            </button>
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="list-view">
          {businesses.length === 0 ? (
            <div className="all-done">
              <div className="done-emoji">🔍</div>
              <h3>Nothing here yet</h3>
              <p>Try a different category</p>
            </div>
          ) : (
            businesses.map(b => {
              const saved = savedPlaces.some(p => p.id === b.id)
              return (
                <div key={b.id} className="list-card" onClick={() => navigate(`/business/${b.slug}`)}>
                  <div className="list-card-img" style={b.hero_image_url ? undefined : {background:'linear-gradient(135deg,#1a3a5c,#0ea5e9)'}}>
                    {b.hero_image_url && (
                      <img src={b.hero_image_url} alt={b.name} style={{width:'100%',height:'100%',objectFit:'cover'}}
                        onError={e => {
                          try { e.target.style.display='none'; if (e.target.parentNode) e.target.parentNode.style.background='linear-gradient(135deg,#1a3a5c,#0ea5e9)' } catch {}
                        }} />
                    )}
                  </div>
                  <div className="list-card-body">
                    <div className="list-card-top">
                      <div>
                        <div className="list-card-name">{b.name}</div>
                        {b.subtitle && <div className="list-card-sub">{b.subtitle}</div>}
                        <div className="list-card-meta">
                          {b.rating && <span>⭐ {b.rating}</span>}
                          {b.rating && b.price_range && <span className="dot"> · </span>}
                          {b.price_range && <span>{b.price_range}</span>}
                          {(b.rating || b.price_range) && b.city && <span className="dot"> · </span>}
                          {b.city && <span className="list-card-addr">{b.city}</span>}
                        </div>
                      </div>
                      <button
                        className={`list-save-btn ${saved ? 'saved' : ''}`}
                        onPointerDown={e => e.stopPropagation()}
                        onClick={e => { e.stopPropagation(); saved ? removeSavedPlace(b.id) : addSavedPlace(b) }}
                      >
                        {saved ? '♥' : '♡'}
                      </button>
                    </div>
                    {(b.live_music || b.happy_hour || b.duration) && (
                      <div className="list-card-badges">
                        {b.live_music && <span className="badge badge-live">🎵 Live Music</span>}
                        {b.happy_hour && <span className="badge badge-happy">🍹 HH</span>}
                        {b.duration && <span className="badge badge-music">⏱ {b.duration}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function BusinessCard({ business, isTop, onDetail, userLocation }) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const ptrRef = useRef(null)
  const distMiles = userLocation
    ? calcDistance(userLocation.lat, userLocation.lng, business.latitude, business.longitude)
    : null
  const distLabel = formatDistance(distMiles)

  const allPhotos = [
    business.hero_image_url,
    ...(business.photos || []).filter(p => p !== business.hero_image_url)
  ].filter(Boolean)

  const photo = allPhotos[photoIdx] || null

  function handleImgDown(e) {
    ptrRef.current = { x: e.clientX, y: e.clientY }
  }

  function handleImgUp(e) {
    if (!ptrRef.current) return
    const dx = Math.abs(e.clientX - ptrRef.current.x)
    const dy = Math.abs(e.clientY - ptrRef.current.y)
    ptrRef.current = null
    if (dx < 8 && dy < 8 && allPhotos.length > 1) {
      e.stopPropagation()
      setPhotoIdx(i => (i + 1) % allPhotos.length)
    }
  }

  const displayedTags = (business.tags || []).slice(0, 4)
  const desc = business.subtitle || (business.description ? business.description.slice(0, 90) + (business.description.length > 90 ? '…' : '') : '')

  return (
    <div className={`business-card ${isTop ? 'top' : ''}`}>
      {/* Image */}
      <div
        className="card-image-wrap"
        style={!photo ? {background:'linear-gradient(135deg,#1a3a5c,#0ea5e9)'} : undefined}
        onPointerDown={handleImgDown}
        onPointerUp={handleImgUp}
      >
        {photo && (
          <img src={photo} alt={business.name} className="card-image"
            onError={e => { try { e.target.style.display='none'; if (e.target.parentNode) e.target.parentNode.style.background='linear-gradient(135deg,#1a3a5c,#0ea5e9)' } catch {} }} />
        )}
        <div className="card-image-overlay" />

        {business.verified && (
          <div className="card-featured-badge">⭐ Featured</div>
        )}

        {!business.verified && business._matchScore >= 15 && (
          <div className="card-match-badge">⚡ Your Vibe</div>
        )}

        {allPhotos.length > 1 && (
          <div className="card-photo-counter">{photoIdx + 1}/{allPhotos.length}</div>
        )}
      </div>

      {/* Body */}
      <div className="card-body">
        {/* Colored tags */}
        {displayedTags.length > 0 && (
          <div className="card-tags">
            {displayedTags.map(tag => (
              <span key={tag} className={`card-tag ${tagColor(tag)}`}>{tag}</span>
            ))}
          </div>
        )}

        {/* Live Music / Happy Hour badges */}
        {(business.live_music || business.happy_hour || business.duration) && (
          <div className="card-badges">
            {business.live_music && <span className="badge badge-live">🎵 Live Music</span>}
            {business.happy_hour && <span className="badge badge-happy">🍹 Happy Hour {business.happy_hour.split('-')[0].trim()}</span>}
            {business.duration && <span className="badge badge-music">⏱ {business.duration}</span>}
          </div>
        )}

        <div className="card-info">
          <div className="card-name-row">
            <h3 className="card-name">{business.name}</h3>
            {business.rating ? <div className="rating">⭐ {business.rating}</div> : null}
          </div>

          {desc && <div className="card-desc">{desc}</div>}

          <div className="card-meta-row">
            {business.city && <span>📍 {business.city}</span>}
            {business.city && business.price_range && <span className="dot">·</span>}
            {business.price_range && <span>{business.price_range}</span>}
            {distLabel && <><span className="dot">·</span><span className="card-distance">🚗 {distLabel}</span></>}
          </div>
        </div>

        {isTop && (
          <div className="card-ctas"
            onTouchStart={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
          >
            {business.booking_url && (
              <a className="cta-book pressable" href={business.booking_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}>
                📅 Book Now
              </a>
            )}
            <button className="cta-detail pressable"
              onPointerUp={e => { e.stopPropagation(); onDetail() }}
              onClick={e => { e.stopPropagation(); onDetail() }}>
              More Info
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function PromoCard({ card, isTop, onDetail }) {
  return (
    <div className={`business-card promo-card ${isTop ? 'top' : ''}`}>
      <div className="card-image-wrap" style={!card.hero_image_url ? {background:'linear-gradient(135deg,#4f46e5,#7c3aed)'} : undefined}>
        {card.hero_image_url && (
          <img src={card.hero_image_url} alt={card.name} className="card-image"
            onError={e => { try { e.target.style.display='none' } catch {} }} />
        )}
        <div className="card-image-overlay" />
        <div className="card-promo-badge">📅 Tonight</div>
      </div>

      <div className="card-body">
        <div className="card-info">
          <h3 className="card-name">{card.name}</h3>
          {card.description && <div className="card-desc">{card.description}</div>}
          {card.city && (
            <div className="card-meta-row">
              <span>📍 {card.city}</span>
            </div>
          )}
        </div>

        {isTop && (
          <div className="card-ctas"
            onTouchStart={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
          >
            {card.cta_url && (
              <a className="cta-book pressable" href={card.cta_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}>
                {card.cta_label || '📅 Learn More'}
              </a>
            )}
            {card.linked_slug && (
              <button className="cta-detail pressable"
                onPointerUp={e => { e.stopPropagation(); onDetail() }}
                onClick={e => { e.stopPropagation(); onDetail() }}>
                View Place
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SponsoredCard({ business, isTop, onDetail, userLocation }) {
  const [photoIdx, setPhotoIdx] = useState(0)
  const ptrRef = useRef(null)
  const distMiles = userLocation
    ? calcDistance(userLocation.lat, userLocation.lng, business.latitude, business.longitude)
    : null
  const distLabel = formatDistance(distMiles)

  const allPhotos = [
    business.hero_image_url,
    ...(business.photos || []).filter(p => p !== business.hero_image_url)
  ].filter(Boolean)

  const photo = allPhotos[photoIdx] || null

  function handleImgDown(e) { ptrRef.current = { x: e.clientX, y: e.clientY } }
  function handleImgUp(e) {
    if (!ptrRef.current) return
    const dx = Math.abs(e.clientX - ptrRef.current.x)
    const dy = Math.abs(e.clientY - ptrRef.current.y)
    ptrRef.current = null
    if (dx < 8 && dy < 8 && allPhotos.length > 1) {
      e.stopPropagation()
      setPhotoIdx(i => (i + 1) % allPhotos.length)
    }
  }

  const desc = business.subtitle || (business.description ? business.description.slice(0, 90) + (business.description.length > 90 ? '…' : '') : '')

  return (
    <div className={`business-card sponsored-card ${isTop ? 'top' : ''}`}>
      <div
        className="card-image-wrap"
        style={!photo ? {background:'linear-gradient(135deg,#92400e,#d97706)'} : undefined}
        onPointerDown={handleImgDown}
        onPointerUp={handleImgUp}
      >
        {photo && (
          <img src={photo} alt={business.name} className="card-image"
            onError={e => { try { e.target.style.display='none'; if (e.target.parentNode) e.target.parentNode.style.background='linear-gradient(135deg,#92400e,#d97706)' } catch {} }} />
        )}
        <div className="card-image-overlay" />
        <div className="card-sponsored-badge">⭐ Sponsored</div>
        {allPhotos.length > 1 && (
          <div className="card-photo-counter">{photoIdx + 1}/{allPhotos.length}</div>
        )}
      </div>

      <div className="card-body">
        <div className="card-info">
          <div className="card-name-row">
            <h3 className="card-name">{business.name}</h3>
            {business.rating ? <div className="rating">⭐ {business.rating}</div> : null}
          </div>
          {desc && <div className="card-desc">{desc}</div>}
          <div className="card-meta-row">
            {business.city && <span>📍 {business.city}</span>}
            {business.city && business.price_range && <span className="dot">·</span>}
            {business.price_range && <span>{business.price_range}</span>}
            {distLabel && <><span className="dot">·</span><span className="card-distance">🚗 {distLabel}</span></>}
          </div>
        </div>

        {isTop && (
          <div className="card-ctas"
            onTouchStart={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
            onPointerUp={e => e.stopPropagation()}
          >
            <button className="cta-detail"
              onPointerUp={e => { e.stopPropagation(); onDetail() }}
              onClick={e => { e.stopPropagation(); onDetail() }}>
              View Profile
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function SwipeIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path strokeLinecap="round" d="M8 12h8M15 9l3 3-3 3" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
