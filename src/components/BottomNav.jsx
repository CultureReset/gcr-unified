import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import './BottomNav.css'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userId } = useApp()
  const navRef = useRef(null)

  // Publish the nav's real rendered height (safe-area padding included) as
  // --gcr-nav-h, so index.css can reserve exactly that much room at the
  // bottom of every page. Before this, each page guessed its own clearance
  // — 210px here, 80px there, nothing at all on Saves/Profile/Itinerary —
  // and the guesses that were too small (Home's 90px vs. a 64px nav plus a
  // 34px home-indicator inset) left the last card wedged under the footer.
  // Same measure-and-publish pattern as GCRHeader's --gcr-header-h.
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const root = document.documentElement
    const update = () => {
      root.style.setProperty('--gcr-nav-h', el.offsetHeight + 'px')
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    // The home-indicator inset changes when iOS Safari's toolbar collapses
    // or expands, which resizes the nav without resizing its content.
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      // Routes that hide the nav (Landing, Auth, Setup, Swipe…) must not
      // inherit a stale reservation.
      root.style.setProperty('--gcr-nav-h', '0px')
    }
  }, [])

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const navItems = userId
    ? [
        { icon: '🏠', label: 'Home',    path: '/home' },
        { icon: '🔍', label: 'Search',  path: '/search' },
        { icon: '👆', label: 'Swipe',   path: '/swipe/all' },
        { icon: '❤️', label: 'Saves',   path: '/saves' },
        { icon: '👤', label: 'Profile', path: '/profile' },
      ]
    : [
        { icon: '🏠', label: 'Home',     path: '/' },
        { icon: '🔍', label: 'Search',   path: '/search' },
        { icon: '🎉', label: 'Events',   path: '/events' },
        { icon: '👆', label: 'Swipe',    path: '/swipe/restaurants' },
        { icon: '👤', label: 'Sign In',  path: '/auth' },
      ]

  const visibleItems = navItems

  const handleNavClick = (path) => {
    navigate(path)
  }

  return (
    <nav className="bottom-nav" ref={navRef}>
      {visibleItems.map(item => (
        <button
          key={item.path}
          className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
          onClick={() => handleNavClick(item.path)}
          title={item.label}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
