import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import { DEFAULT_MODE } from './config'
import Landing from './pages/Landing'
import Browse from './pages/Browse'
import CategoryListings from './pages/CategoryListings'
import CategoryPage from './pages/CategoryPage'
import Events from './pages/Events'
import Search from './pages/Search'
import Auth from './pages/Auth'
import Reset from './pages/Reset'
import Invite from './pages/Invite'
import Setup from './pages/Setup'
import Home from './pages/Home'
import Swipe from './pages/Swipe'
import BusinessDetail from './pages/BusinessDetail'
import MyList from './pages/MyList'
import Building from './pages/Building'
import Itinerary from './pages/Itinerary'
import Profile from './pages/Profile'
import Saves from './pages/Saves'
import Groups from './pages/Groups'
import Group from './pages/Group'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import ReviewUpload from './pages/ReviewUpload'
import BottomNav from './components/BottomNav'
import InstallBanner from './components/InstallBanner'

function RequireAuth({ children }) {
  const { userId } = useApp()
  const location = useLocation()
  const hasToken = !!localStorage.getItem('gcr_access_token')
  if (!hasToken && !userId) {
    return <Navigate to="/auth" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}

function AppRoutes() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useApp()
  const hideNav = ['/', '/auth'].some(p => location.pathname === p) ||
    location.pathname.startsWith('/setup')

  useEffect(() => {
    function onUnauth() {
      logout()
      const publicPaths = ['/', '/auth', '/reset', '/join', '/privacy', '/terms']
      if (!publicPaths.includes(location.pathname)) {
        navigate('/auth', { replace: true, state: { from: location.pathname + location.search } })
      }
    }
    window.addEventListener('gcr:unauthorized', onUnauth)
    return () => window.removeEventListener('gcr:unauthorized', onUnauth)
  }, [location.pathname, location.search, logout, navigate])

  // Track route changes — fires on every page navigation
  useEffect(() => {
    const API = import.meta.env.VITE_API_BASE || 'https://gcr-api-clean-fresh.vercel.app'
    let sess = sessionStorage.getItem('ts_sess_id')
    if (!sess) { sess = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('ts_sess_id', sess) }
    const qs = new URLSearchParams(location.search)
    const utm = {}
    ;['utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(k => {
      const v = qs.get(k) || sessionStorage.getItem('ts_' + k)
      if (v) { utm[k] = v; sessionStorage.setItem('ts_' + k, v) }
    })
    const device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
    fetch(API + '/api/gcr/track', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_path: location.pathname, referrer: document.referrer || null, session_id: sess, device_type: device, source: 'tripswipe', ...utm })
    }).catch(() => {})
  }, [location.pathname])

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/browse" element={<Navigate to="/" replace />} />
        <Route path="/search" element={<Search />} />
        <Route path="/category/:category" element={<CategoryListings />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/reset" element={<Reset />} />
        <Route path="/join" element={<Invite />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/review/:slug" element={<ReviewUpload />} />
        <Route path="/setup/*" element={<RequireAuth><Setup /></RequireAuth>} />
        <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/swipe/:category" element={<Swipe />} />
        <Route path="/business/:slug" element={<BusinessDetail />} />
        <Route path="/list" element={<RequireAuth><MyList /></RequireAuth>} />
        <Route path="/building" element={<RequireAuth><Building /></RequireAuth>} />
        <Route path="/itinerary" element={<RequireAuth><Itinerary /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="/saves" element={<RequireAuth><Saves /></RequireAuth>} />
        <Route path="/groups" element={<RequireAuth><Groups /></RequireAuth>} />
        <Route path="/group/:slug" element={<RequireAuth><Group /></RequireAuth>} />

        {/* GCR Category Pages */}
        <Route path="/restaurants" element={<CategoryPage />} />
        <Route path="/coffee" element={<CategoryPage />} />
        <Route path="/happy-hours" element={<CategoryPage />} />
        <Route path="/events" element={<Events />} />
        <Route path="/things-to-do" element={<CategoryPage />} />
        <Route path="/services" element={<CategoryPage />} />
        <Route path="/public-spots" element={<CategoryPage />} />
        <Route path="/feed" element={<CategoryPage />} />
        <Route path="/shopping" element={<CategoryPage />} />
        <Route path="/staying" element={<CategoryPage />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {!hideNav && <BottomNav />}
      {!hideNav && <InstallBanner />}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
