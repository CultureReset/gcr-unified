import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './GCRHeader.css'

const LOYALTY_PHONE = '+12513135464'
const LOYALTY_KEYWORD = 'BEACH'

function LoyaltyModal({ onClose }) {
  return (
    <div className="loyalty-overlay" onClick={onClose}>
      <div className="loyalty-modal" onClick={e => e.stopPropagation()}>
        <button className="loyalty-close" onClick={onClose}>✕</button>
        <div className="loyalty-emoji">⭐</div>
        <h2 className="loyalty-title">Join Our Loyalty Program</h2>
        <p className="loyalty-desc">Text <strong>BEACH</strong> to sign up for deals, specials &amp; rewards while you're on the Gulf Coast!</p>

        <a
          className="loyalty-sms-btn"
          href={`sms:${LOYALTY_PHONE}?body=${LOYALTY_KEYWORD}`}
        >
          📱 Tap to Text BEACH → Sign Up
        </a>

        <div className="loyalty-divider">or text manually</div>

        <div className="loyalty-number">{LOYALTY_PHONE}</div>
        <p className="loyalty-hint">Send the word <strong>BEACH</strong> to that number</p>
      </div>
    </div>
  )
}

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
  { id: 'nightlife', label: 'Bars & Nightlife', emoji: '🍸' },
  { id: 'wellness', label: 'Health & Wellness', emoji: '💆' },
]

export default function GCRHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const { userId } = useApp()
  const headerRef = useRef(null)
  const [showLoyalty, setShowLoyalty] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = e => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setInstallPrompt(null)
  }

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
          {userId ? (
            <button className="header-auth-btn" onClick={() => navigate('/profile')}>👤</button>
          ) : (
            <button className="header-auth-btn" onClick={() => navigate('/auth')}>Sign In</button>
          )}
          {!installed && (
            <button className="install-btn" onClick={handleInstall}>
              📲 Install App
            </button>
          )}
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
        <button className="strip-btn gold" onClick={() => setShowLoyalty(true)}>📲 Sign Up for Promos 🎁</button>
        <button className="strip-btn teal">📅 Master Calendar 🎉</button>
      </div>

      {showLoyalty && <LoyaltyModal onClose={() => setShowLoyalty(false)} />}
    </header>
  )
}
