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

  // Get current category from route
  const currentPath = location.pathname.slice(1) // remove leading /
  const activeCat = CATEGORIES.find(c => c.id === currentPath)

  return (
    <header className="gcr-header">
      {/* Row 1: Logo + Install */}
      <div className="gcr-header-top">
        <div className="gcr-logo" onClick={() => navigate('/')}>
          <img src="/gcr-logo.png" alt="Gulf Coast Radar" className="logo-img" onError={e => e.target.style.display='none'} />
          <span className="logo-text">GULF<span className="logo-coast">COAST</span>RADAR</span>
        </div>
        <button className="install-btn">📲 Install App</button>
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
