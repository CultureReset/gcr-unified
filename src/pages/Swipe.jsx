import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import TinderCard from 'react-tinder-card'
import { useApp } from '../context/AppContext'
import { CATEGORIES } from '../data/categories'
import { fetchBusinesses, calcDistance, formatDistance, fetchPreferences, personalizeAndSort } from '../services/gcrApi'
import { API_BASE } from '../config'
import './Swipe.css'

// Fetch social post cards (IG Reels, FB videos) to inject into the swipe deck
async function fetchSocialCards() {
  try {
    const res = await fetch(`${API_BASE}/api/gcr/social-posts/feed?limit=20`)
    if (!res.ok) return []
    const d = await res.json()
    return (d.posts || []).map(p => ({
      ...p,
      _isSocial: true,
      slug: `social-${p.id}`,
      id: `social-${p.id}`,
      name: p.caption || p.entity_slug,
      category: 'all', // inject into every category view
    }))
  } catch {
    return []
  }
}

// Every tab here must correspond to a value mapCategory() in gcrApi.js can
// actually produce (stay/food/nightlife/shopping/activities) — a tab whose id
// never matches any card's category always renders an empty deck. "Drinks"
// had no distinct category (bars/cocktail spots already come through under
// Nightlife) so it's dropped rather than left as a dead end. "Events" isn't a
// swipeable entity at all — events live in a separate feed — so that tab
// links out to the real Events page instead of filtering the (always-empty)
// swipe deck.
const CAT_TABS = [
  { id: 'all',        label: 'All',        emoji: '🌟' },
  { id: 'food',       label: 'Food',       emoji: '🍽️' },
  { id: 'nightlife',  label: 'Nightlife',  emoji: '🎵' },
  { id: 'activities', label: 'Activities', emoji: '🏄' },
  { id: 'shopping',   label: 'Shopping',   emoji: '🛍️' },
  { id: 'stay',       label: 'Stay',       emoji: '🏨' },
  { id: 'events',     label: 'Events',     emoji: '🎪', to: '/events' },
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

// Open/closed status line — same logic as GCRCard.jsx (not shared as a util
// since that component pulls in its own CSS/deps this page doesn't need).
function fmt12(t) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m ? `${h12}:${String(m).padStart(2,'0')}${ap}` : `${h12}${ap}`
}

function getTodayHours(hours) {
  if (!hours || !hours.length) return null
  const todayIdx = new Date().getDay()
  const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const todayName = DAYS[todayIdx]
  return hours.find(h => {
    if (typeof h.day_of_week === 'number') return h.day_of_week === todayIdx
    const s = String(h.day_of_week || h.day || '').toLowerCase()
    return s === todayName || s === String(todayIdx)
  }) || null
}

function computeStatus(hours) {
  if (!hours || !hours.length) return null
  const h = getTodayHours(hours)
  if (!h) return null
  if (h.is_closed) return { label: 'Closed Today', cls: 'closed' }

  const openStr  = h.open_time  || h.opens_at  || h.open  || ''
  const closeStr = h.close_time || h.closes_at || h.close || ''
  if (!openStr || !closeStr) return null

  const cur = new Date().getHours() * 60 + new Date().getMinutes()
  const [oh, om] = openStr.split(':').map(Number)
  const [ch, cm] = closeStr.split(':').map(Number)
  const openMin  = oh * 60 + om
  const closeMin = ch * 60 + cm

  if (cur < openMin - 60) return null
  if (cur < openMin)       return { label: `Opens ${fmt12(openStr)}`,           cls: 'opening' }
  if (cur < closeMin - 30) return { label: `Open · Closes ${fmt12(closeStr)}`,  cls: 'open'    }
  if (cur < closeMin)      return { label: `Closing Soon · ${fmt12(closeStr)}`, cls: 'closing' }
  return { label: 'Closed', cls: 'closed' }
}

export default function Swipe() {
  const { category } = useParams()
  const navigate = useNavigate()
  const { addSavedPlace, removeSavedPlace, savedPlaces, addSuperLike, tourist, seenSlugs, setSeenSlugs, recordSwipe, resetSeenSlugs, userLocation, requestLocation, geocodeStay } = useApp()

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
  const [swipingDir, setSwipingDir] = useState(null)
  const [undoStack, setUndoStack] = useState([]) // { business, action: 'like'|'nope'|'super' }
  const swipeCountRef = useRef(0)
  const pageRef = useRef(null)

  const catInfo = CATEGORIES.find(c => c.id === category) || CATEGORIES[5]

  // /swipe/events and /swipe/drinks aren't real swipeable categories (see
  // CAT_TABS comment) — catch direct/bookmarked links to them too, not just
  // the tab bar. Drinks has no dedicated page, so send it to the closest
  // real category (bars/cocktails already surface under Nightlife).
  // /swipe/restaurants isn't a real category either (the real id is "food")
  // but it's hardcoded as the Swipe entry point in BottomNav, GCRHeader,
  // Landing, and Browse — every one of those was a guaranteed dead end
  // (0 cards, no matching filter) until this redirect existed.
  useEffect(() => {
    if (category === 'events') navigate('/events', { replace: true })
    else if (category === 'drinks') navigate('/swipe/nightlife', { replace: true })
    else if (category === 'restaurants') navigate('/swipe/food', { replace: true })
  }, [category, navigate])

  const businesses = (category === 'all'
    // Promos are admin-scoped to a category (gcrApi.js defaults unset ones to 'all') —
    // only exclude ones deliberately targeted at a specific tab, same rule deals/social
    // cards already follow (they're always category:'all' and always show here).
    ? allBusinesses.filter(b => !b._isPromo || b.category === 'all')
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
    Promise.all([fetchBusinesses(), fetchPreferences(), fetchSocialCards()])
      .then(([all, prefs, social]) => {
        if (cancelled) return
        setPrefMap(prefs)
        // Inject social cards every 5th position in the pool
        const withSocial = [...all]
        social.forEach((card, i) => {
          const insertAt = (i + 1) * 5
          if (insertAt <= withSocial.length) withSocial.splice(insertAt, 0, card)
          else withSocial.push(card)
        })
        setAllBusinesses(withSocial)
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
    const token = localStorage.getItem('gcr_access_token')
    const isGuest = !token
    let timer = null
    fetch(`${API_BASE}/api/admin/sms-config`)
      .then(r => r.json())
      .then(cfg => {
        if (!cfg.popup_enabled) return
        const val = parseInt(cfg.popup_value) || 5
        if (cfg.popup_trigger === 'time') {
          timer = setTimeout(() => setSmsPrompt(true), val * 60 * 1000)
        } else {
          // Guests: show after they finish the 15-card free deck, not mid-deck
          // Logged-in: use configured value
          swipeCountRef.current = isGuest ? -DECK_SIZE : -val
        }
      })
      .catch(() => {
        // default: guests see prompt after finishing the deck, others after 5 min
        if (isGuest) {
          swipeCountRef.current = -DECK_SIZE
        } else {
          timer = setTimeout(() => setSmsPrompt(true), 5 * 60 * 1000)
        }
      })
    return () => { if (timer) clearTimeout(timer) }
  }, [smsDone])

  useEffect(() => {
    if (allBusinesses.length === 0) return
    setDeckReady(false)
    const token = localStorage.getItem('gcr_access_token')
    const isGuest = !token
    // Guests always get a fresh deck — don't filter by seenSlugs so the first
    // 15 cards always show regardless of prior localStorage state
    const visible = (category === 'all'
      ? allBusinesses.filter(b => !b._isPromo || b.category === 'all')
      : allBusinesses.filter(b => b.category === category))
      .filter(b => isGuest ? true : !seenSlugs.includes(b.slug))
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
      ? allBusinesses.filter(b => !b._isPromo || b.category === 'all')
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
    <div className="swipe-page page safe-top">
      <div className="swipe-header">
        <button className="back-btn-sm close-btn" onClick={() => window.history.back()}>
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} width={20} height={20}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="swipe-title"><span>{catInfo.emoji}</span><span>Swipe Your Trip</span></div>
        <div style={{width:40}} />
      </div>
      <div className="cat-tabs">
        {CAT_TABS.map(tab => (
          <div key={tab.id} className={`cat-tab ${category === tab.id ? 'active' : ''}`}>
            <span>{tab.emoji}</span><span>{tab.label}</span>
          </div>
        ))}
      </div>
      <div className="cards-container">
        <div className="swipe-card-wrapper" style={{position:'relative'}}>
          <div className="business-card" style={{animation:'shimmer 1.4s infinite'}}>
            <div className="card-image-wrap" style={{background:'rgba(255,255,255,0.06)'}} />
            <div className="card-body">
              <div style={{height:22,width:'60%',background:'rgba(255,255,255,0.08)',borderRadius:8,marginBottom:10}} />
              <div style={{height:14,width:'40%',background:'rgba(255,255,255,0.05)',borderRadius:8}} />
            </div>
          </div>
        </div>
      </div>
      <div className="swipe-actions">
        <div className="action-btn nope" style={{opacity:0.3}} />
        <div className="action-btn super" style={{opacity:0.3}} />
        <div className="action-btn like" style={{opacity:0.3}} />
      </div>
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
    setSwipingDir(null)
    if (direction === 'right') {
      addSavedPlace(resolveReal(business))
      setLikedCount(p => p + 1)
      flash('like')
      recordSwipe(business, 'like')
      setUndoStack(prev => [...prev.slice(-4), { business, action: 'like' }])
    } else {
      flash('nope')
      recordSwipe(business, 'nope')
      setUndoStack(prev => [...prev.slice(-4), { business, action: 'nope' }])
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
    setUndoStack(prev => [...prev.slice(-4), { business: top, action: 'like' }])
  }

  function pressNope() {
    if (cards.length === 0) return
    const top = cards[cards.length - 1]
    recordSwipe(top, 'nope')
    setCards(prev => refillDeck(prev.slice(0, -1)))
    flash('nope')
    setUndoStack(prev => [...prev.slice(-4), { business: top, action: 'nope' }])
  }

  function pressSuper() {
    if (cards.length === 0) return
    const top = cards[cards.length - 1]
    addSuperLike(resolveReal(top))
    recordSwipe(top, 'super')
    setLikedCount(p => p + 1)
    setCards(prev => refillDeck(prev.slice(0, -1)))
    flash('super')
    setUndoStack(prev => [...prev.slice(-4), { business: top, action: 'super' }])
  }

  // "Not sure yet" — distinct from Pass (rejected) and Like (want to go).
  // Mild positive signal for preference scoring (see SWIPE_WEIGHTS.maybe on
  // the backend), doesn't save the place, but is undo-able like every other action.
  function pressMaybe() {
    if (cards.length === 0) return
    const top = cards[cards.length - 1]
    recordSwipe(top, 'maybe')
    setCards(prev => refillDeck(prev.slice(0, -1)))
    flash('maybe')
    setUndoStack(prev => [...prev.slice(-4), { business: top, action: 'maybe' }])
  }

  function pressUndo() {
    if (undoStack.length === 0) return
    const last = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    // Reverse the action
    if (last.action === 'like') {
      removeSavedPlace(last.business.id)
      setLikedCount(p => Math.max(0, p - 1))
    } else if (last.action === 'super') {
      removeSavedPlace(last.business.id)
      setLikedCount(p => Math.max(0, p - 1))
    }
    // Put the card back on top of the deck
    setCards(prev => {
      const without = prev.filter(b => b.id !== last.business.id)
      return [...without, last.business]
    })
    // Remove from seenSlugs so it doesn't get filtered
    setSeenSlugs(prev => {
      const updated = prev.filter(s => s !== last.business.slug)
      localStorage.setItem('gcr_seen', JSON.stringify(updated))
      return updated
    })
  }

  const allGone = deckReady && cards.length === 0 && pool.filter(b => !seenSlugs.includes(b.slug)).length === 0

  const tripLabel = [
    tourist?.destination?.split(',')[0],
    tourist?.arrival && new Date(tourist.arrival).toLocaleDateString('en-US', {month:'short', day:'numeric'}),
  ].filter(Boolean).join(' · ') || 'Gulf Coast'

  return (
    <div className="swipe-page page safe-top" ref={pageRef}>
      {/* Header — wrapped with the location prompt so the prompt can float
          just below it (position:absolute) instead of pushing the deck down.
          It shows for any first-time visitor with no location yet (not an
          edge case), so it was permanently eating ~40px of card space. */}
      <div className="swipe-header-wrap">
        <div className="swipe-header">
          <div className="swipe-header-left">
            <button className="back-btn-sm" onClick={() => navigate('/home')} aria-label="Home">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} width={19} height={19}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4a1 1 0 001-1v-4h2v4a1 1 0 001 1h4a1 1 0 001-1V10" />
              </svg>
            </button>
            <button className="back-btn-sm close-btn" onClick={closeTrip} aria-label="Close">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} width={20} height={20}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
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
      </div>

      {/* Category tabs */}
      <div className="cat-tabs">
        {CAT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`cat-tab ${category === tab.id ? 'active' : ''}`}
            onClick={() => navigate(tab.to || `/swipe/${tab.id}`)}
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
              {lastAction === 'like' ? '❤️ LIKE' : lastAction === 'super' ? '⭐ MUST DO' : lastAction === 'maybe' ? '🤔 MAYBE' : '✕ NOPE'}
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
                  onCardLeftScreen={() => { setSwipingDir(null); onCardLeftScreen(business) }}
                  onSwipingDirection={(dir) => { if (index === cards.length - 1) setSwipingDir(dir) }}
                  preventSwipe={['up', 'down']}
                  className="swipe-card-wrapper"
                >
                  {business._isPromo
                    ? <PromoCard card={business} isTop={index === cards.length - 1} onDetail={() => navigate(business.linked_slug ? `/business/${business.linked_slug}` : '#')} />
                    : business._isSocial
                      ? <SocialCard post={business} isTop={index === cards.length - 1} onDetail={() => navigate(`/business/${business.entity_slug}`)} swipingDir={index === cards.length - 1 ? swipingDir : null} />
                      : business._isSponsored
                      ? <SponsoredCard business={business} isTop={index === cards.length - 1} onDetail={() => navigate(`/business/${business._sponsorSlug}`)} userLocation={userLocation} swipingDir={index === cards.length - 1 ? swipingDir : null} />
                      : business._isDeal
                        ? <DealSwipeCard deal={business._dealData} isTop={index === cards.length - 1} onDetail={() => business.entity_slug ? navigate(`/business/${business.entity_slug}`) : navigate('/deals')} />
                        : <BusinessCard business={business} isTop={index === cards.length - 1} onDetail={() => navigate(`/business/${business.slug}`)} userLocation={userLocation} swipingDir={index === cards.length - 1 ? swipingDir : null} />
                  }
                </TinderCard>
              ))
            )}
          </div>

          {!allGone && (
            <div className="swipe-actions">
              <div className="swipe-actions-row secondary">
                <button className="action-btn maybe" onClick={pressMaybe}>
                  <span>🤔</span>
                  <span>MAYBE</span>
                </button>
                <button
                  className={`action-btn undo ${undoStack.length === 0 ? 'disabled' : ''}`}
                  onClick={pressUndo}
                  disabled={undoStack.length === 0}
                  aria-label="Undo last swipe"
                >
                  <span>↩</span>
                  <span>UNDO</span>
                </button>
              </div>
              <div className="swipe-actions-row primary">
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
            <div style={{width:40,height:4,background:'#0ea5e9',borderRadius:999,margin:'0 auto 20px',opacity:0.5}}></div>
            <div style={{fontSize:24,textAlign:'center',marginBottom:8}}>📲</div>
            <h3 style={{textAlign:'center',color:'#fff',fontSize:18,fontWeight:900,margin:'0 0 6px'}}>Save your picks + get local deals</h3>
            <p style={{textAlign:'center',color:'rgba(255,255,255,.6)',fontSize:14,margin:'0 0 20px',lineHeight:1.5}}>
              Drop your number to save your likes and get same-day specials texted to you while you're here.
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
              style={{width:'100%',background:'linear-gradient(135deg,#0ea5e9,#0369a1)',color:'#fff',border:'none',borderRadius:10,padding:'14px',fontSize:16,fontWeight:800,cursor:'pointer',marginBottom:10}}
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

// ── Social Card — Instagram Reel / Facebook video injected into the swipe deck ──
function SocialCard({ post, isTop, onDetail, swipingDir }) {
  const videoRef = useRef(null)
  const isVideo = post.media_type === 'reel' || post.media_type === 'video'
  const platformIcon = { instagram: '📸', facebook: '👥', tiktok: '🎵' }[post.platform] || '📱'
  const platformLabel = { instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok' }[post.platform] || post.platform

  // Autoplay video when this card is on top
  useEffect(() => {
    if (!videoRef.current) return
    if (isTop) { videoRef.current.play().catch(() => {}) }
    else { videoRef.current.pause() }
  }, [isTop])

  const tintStyle = swipingDir === 'right'
    ? { boxShadow: '0 0 0 4px #4ade80', border: '2px solid #4ade80' }
    : swipingDir === 'left'
    ? { boxShadow: '0 0 0 4px #ef4444', border: '2px solid #ef4444' }
    : {}

  return (
    <div className="swipe-card social-card" style={tintStyle}>
      {/* Platform badge */}
      <div className="social-card-badge">
        <span>{platformIcon}</span>
        <span>{platformLabel}</span>
      </div>

      {/* Video or image */}
      {isVideo && post.video_url ? (
        <video
          ref={videoRef}
          src={post.video_url}
          poster={post.thumbnail_url}
          muted
          loop
          playsInline
          className="social-card-media"
        />
      ) : post.thumbnail_url ? (
        <img src={post.thumbnail_url} alt={post.caption || 'Post'} className="social-card-media" />
      ) : (
        <div className="social-card-placeholder">
          <span style={{ fontSize: 48 }}>{platformIcon}</span>
        </div>
      )}

      {/* Bottom info bar */}
      <div className="social-card-info">
        {post.entity_name && <div className="social-card-biz">{post.entity_name}</div>}
        {post.caption && <div className="social-card-caption">{post.caption.slice(0, 80)}{post.caption.length > 80 ? '…' : ''}</div>}
        <button className="social-card-view" onClick={onDetail}>View Profile →</button>
      </div>

      {/* Play indicator for videos */}
      {isVideo && !post.video_url && (
        <div className="social-card-play-badge">▶ Reel</div>
      )}
    </div>
  )
}

function BusinessCard({ business, isTop, onDetail, userLocation, swipingDir }) {
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
  const status = computeStatus(business.hours || [])

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

        {/* Drag direction tint + stamp */}
        {swipingDir === 'right' && (
          <div className="card-drag-tint like-tint">
            <span className="drag-stamp like-stamp">LIKE ♥</span>
          </div>
        )}
        {swipingDir === 'left' && (
          <div className="card-drag-tint nope-tint">
            <span className="drag-stamp nope-stamp">NOPE ✕</span>
          </div>
        )}

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

      {/* Info overlaid at bottom of image */}
      <div className="card-overlay-info">
        {/* Tags above name — no longer collide with top-left badges */}
        {displayedTags.length > 0 && (
          <div className="card-tags-overlay-bottom">
            {displayedTags.slice(0,3).map(tag => (
              <span key={tag} className={`card-tag ${tagColor(tag)}`}>{tag}</span>
            ))}
          </div>
        )}
        <div className="card-name-row">
          <h3 className="card-name">{business.name}</h3>
          {business.rating ? (
            <div className="card-rating">
              ⭐ {business.rating}
              {business.review_count > 0 && <span className="card-review-count"> ({business.review_count})</span>}
            </div>
          ) : null}
        </div>
        <div className="card-meta-row">
          {business.city && <span>📍 {business.city}</span>}
          {business.price_range && <><span className="dot">·</span><span>{business.price_range}</span></>}
          {distLabel && <><span className="dot">·</span><span>🚗 {distLabel}</span></>}
        </div>
        {desc && <p className="card-desc">{desc}</p>}
        {(status || business.live_music || business.happy_hour || business.duration) && (
          <div className="card-badges" style={{marginTop:6}}>
            {status && <span className={`badge badge-status-${status.cls}`}>{status.label}</span>}
            {business.live_music && <span className="badge badge-live">🎵 Live</span>}
            {business.happy_hour && <span className="badge badge-happy">🍹 HH</span>}
            {business.duration && <span className="badge badge-music">⏱ {business.duration}</span>}
          </div>
        )}
      </div>

      {/* Body — CTAs only */}
      {isTop && (
        <div className="card-body"
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
        >
          <div className="card-ctas" style={!business.booking_url ? {gridTemplateColumns:'1fr'} : undefined}>
            {business.booking_url && (
              <a className="cta-book pressable" href={business.booking_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}>
                📅 Book Now
              </a>
            )}
            <button className="cta-detail pressable"
              onPointerUp={e => { e.stopPropagation(); onDetail() }}
              onClick={e => { e.stopPropagation(); onDetail() }}>
              View Details →
            </button>
          </div>
        </div>
      )}
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

function SponsoredCard({ business, isTop, onDetail, userLocation, swipingDir }) {
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
        {swipingDir === 'right' && (
          <div className="card-drag-tint like-tint">
            <span className="drag-stamp like-stamp">LIKE ♥</span>
          </div>
        )}
        {swipingDir === 'left' && (
          <div className="card-drag-tint nope-tint">
            <span className="drag-stamp nope-stamp">NOPE ✕</span>
          </div>
        )}
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

function DealSwipeCard({ deal, isTop, onDetail }) {
  if (!deal) return null

  const DEAL_COLORS = {
    charter_opening: { bg: 'linear-gradient(135deg,#0e5f8a,#0ea5e9)', badge: '🎣 Charter Spot' },
    last_minute:     { bg: 'linear-gradient(135deg,#b45309,#f59e0b)', badge: '⚡ Last Minute' },
    rental_gap:      { bg: 'linear-gradient(135deg,#065f46,#10b981)', badge: '🏠 Rental Opening' },
    session_opening: { bg: 'linear-gradient(135deg,#4c1d95,#8b5cf6)', badge: '📸 Photo Session' },
    happy_hour:      { bg: 'linear-gradient(135deg,#92400e,#d97706)', badge: '🍻 Happy Hour' },
    daily_special:   { bg: 'linear-gradient(135deg,#065f46,#34d399)', badge: '🌟 Daily Special' },
  }
  const style = DEAL_COLORS[deal.deal_type] || DEAL_COLORS.last_minute

  const spotsRemaining = deal.spots_remaining
  const spotsTotal = deal.spots_total
  const urgency = spotsRemaining !== null && spotsRemaining <= 2

  return (
    <div className={`business-card deal-swipe-card ${isTop ? 'top' : ''}`}>
      {/* Full-bleed background */}
      <div className="card-image-wrap" style={{ background: style.bg, minHeight: 150 }}>
        {deal.image_url && (
          <img src={deal.image_url} alt={deal.entity_name} className="card-image"
            style={{ opacity: 0.35 }}
            onError={e => { try { e.target.style.display = 'none' } catch {} }} />
        )}
        <div className="card-image-overlay" />

        {/* Deal type badge top-left */}
        <div className="card-featured-badge" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          {style.badge}
        </div>

        {/* Urgency pulse top-right */}
        {urgency && (
          <div className="deal-swipe-urgent">🔴 URGENT</div>
        )}

        {/* Main content overlaid on image bottom */}
        <div className="card-overlay-info deal-swipe-overlay">
          <div className="deal-swipe-entity">{deal.entity_name}</div>
          <h3 className="card-name deal-swipe-headline">{deal.headline}</h3>

          {/* Spots bar */}
          {spotsRemaining !== null && spotsTotal && (
            <div className="deal-swipe-spots">
              <div className="deal-swipe-spots-text">
                {spotsRemaining === 0
                  ? '🔴 Fully booked'
                  : spotsRemaining === 1
                  ? '🔴 Last spot!'
                  : spotsRemaining <= 3
                  ? `🟡 Only ${spotsRemaining} spot${spotsRemaining !== 1 ? 's' : ''} left`
                  : `🟢 ${spotsRemaining} of ${spotsTotal} open`}
              </div>
              <div className="deal-swipe-bar">
                <div
                  className="deal-swipe-bar-fill"
                  style={{ width: `${Math.min(100, ((spotsTotal - spotsRemaining) / spotsTotal) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Price */}
          {(deal.deal_price || deal.price_label) && (
            <div className="deal-swipe-price">
              {deal.price_label || `$${deal.deal_price}${deal.price_unit ? `/${deal.price_unit}` : ''}`}
            </div>
          )}

          <div className="deal-swipe-hint">← Swipe right to save · Tap for details →</div>
        </div>
      </div>

      {/* CTA body */}
      {isTop && (
        <div className="card-body"
          onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
        >
          <div className="card-ctas" style={!deal.claim_url ? { gridTemplateColumns: '1fr' } : undefined}>
            {deal.claim_url && (
              <a className="cta-book pressable" href={deal.claim_url} target="_blank" rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}>
                {deal.deal_type === 'charter_opening' ? '🎣 Grab This Spot' :
                 deal.deal_type === 'rental_gap' ? '🏠 Book Now' :
                 '📅 Claim Deal'}
              </a>
            )}
            <button className="cta-detail pressable"
              onPointerUp={e => { e.stopPropagation(); onDetail() }}
              onClick={e => { e.stopPropagation(); onDetail() }}>
              View Details →
            </button>
          </div>
        </div>
      )}
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
