import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './GCRHeader.css'

const CATEGORIES = [
  { id: 'restaurants', label: 'Restaurants', emoji: '🍽️' },
  { id: 'coffee', label: 'Coffee & Sweets', emoji: '☕' },
  { id: 'happy-hours', label: 'Happy Hours', emoji: '🍻' },
  { id: 'events', label: 'Events', emoji: '🎉' },
  { id: 'things-to-do', label: 'Things To Do', emoji: '🎯' },
  { id: 'services', label: 'Services', emoji: '🛠️' },
  { id: 'public-spots', label: 'Public Spots', emoji: '✨' },
  { id: 'feed', label: 'Live Feed', emoji: '📡' },
  { id: 'shopping', label: 'Shopping', emoji: '🛍️' },
  { id: 'staying', label: 'Staying', emoji: '🏨' },
]

export default function GCRHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const headerRef = useRef(null)

  const currentPath = location.pathname.slice(1)
  const activeCat = CATEGORIES.find(c => c.id === currentPath)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => document.documentElement.style.setProperty('--gcr-header-h', el.offsetHeight + 'px')
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <header className="gcr-header" ref={headerRef}>
      {/* Row 1: Logo + Install */}
      <div className="gcr-header-top">
        <div className="gcr-logo" onClick={() => navigate('/')}>
          <img src="/gcr-logo.png" alt="Gulf Coast Radar" className="logo-img" onError={e => e.target.style.display='none'} />
          <span className="logo-text">GULF<span className="logo-coast">COAST</span>RADAR</span>
        </div>
        <div className="gcr-header-right">
          <button className="trip-swipe-btn" onClick={() => navigate('/swipe/restaurants')}>
            👆 Trip Swipe →
          </button>
          <button className="install-btn">📲 Install App</button>
        </div>
      </div>

      {/* Row 2: Category Tabs */}
      <div className="gcr-cat-tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`cat-tab ${activeCat?.id === cat.id ? 'active' : ''}`}
            onClick={() => navigate(`/${cat.id}`)}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Row 3: Action Strip */}
      <div className="gcr-action-strip">
        <button className="strip-btn gold">⭐ Join Our Loyalty Program 🎁</button>
        <button className="strip-btn teal">📅 Master Calendar 🎉</button>
      </div>
    </header>
  )
}
