import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://gcr-api-clean.vercel.app'

export default function Dashboard() {
  const { userId } = useApp()
  const navigate = useNavigate()
  const [businesses, setBusinesses] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!userId) {
      navigate('/auth')
      return
    }

    async function loadBusinesses() {
      try {
        setLoading(true)
        const token = localStorage.getItem('gcr_access_token')
        const res = await fetch(`${API_BASE}/api/dashboard/businesses`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data) ? data : data.businesses || []
          setBusinesses(list)
          if (list.length > 0) {
            setSelectedBusiness(list[0])
          }
        }
      } catch (err) {
        console.error('Error loading businesses:', err)
      } finally {
        setLoading(false)
      }
    }
    loadBusinesses()
  }, [userId, navigate])

  if (loading) return <div className="dashboard-loading">Loading dashboard...</div>

  if (!selectedBusiness) {
    return (
      <div className="dashboard-empty">
        <h1>Welcome!</h1>
        <p>Create your first business to get started</p>
        <button className="create-btn" onClick={() => navigate('/create-business')}>
          Create Business
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>{selectedBusiness.name}</h1>
        <div className="business-switcher">
          <select
            value={selectedBusiness.id}
            onChange={(e) => {
              const biz = businesses.find(b => b.id === e.target.value)
              if (biz) setSelectedBusiness(biz)
            }}
          >
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <div className="dashboard-sidebar">
        <nav className="dashboard-nav">
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Overview
          </button>

          {/* Artist Tabs */}
          {selectedBusiness.type === 'artist' && (
            <>
              <button
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                👤 Profile
              </button>
              <button
                className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`}
                onClick={() => setActiveTab('queue')}
              >
                🎵 Live Queue
              </button>
              <button
                className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookings')}
              >
                📅 Bookings
              </button>
              <button
                className={`nav-item ${activeTab === 'goals' ? 'active' : ''}`}
                onClick={() => setActiveTab('goals')}
              >
                🎯 Goals & Coops
              </button>
            </>
          )}

          {/* Restaurant Tabs */}
          {selectedBusiness.type === 'restaurant' && (
            <>
              <button
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                👤 Profile
              </button>
              <button
                className={`nav-item ${activeTab === 'artist' ? 'active' : ''}`}
                onClick={() => setActiveTab('artist')}
              >
                🎸 Set Live Artist
              </button>
              <button
                className={`nav-item ${activeTab === 'queue' ? 'active' : ''}`}
                onClick={() => setActiveTab('queue')}
              >
                🎵 Song Requests
              </button>
              <button
                className={`nav-item ${activeTab === 'menu' ? 'active' : ''}`}
                onClick={() => setActiveTab('menu')}
              >
                🍽️ Menu
              </button>
            </>
          )}

          {/* Condo Tabs */}
          {selectedBusiness.type === 'condo' && (
            <>
              <button
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                🏠 Properties
              </button>
              <button
                className={`nav-item ${activeTab === 'calendar' ? 'active' : ''}`}
                onClick={() => setActiveTab('calendar')}
              >
                📅 Calendar
              </button>
              <button
                className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookings')}
              >
                📦 Bookings
              </button>
              <button
                className={`nav-item ${activeTab === 'guests' ? 'active' : ''}`}
                onClick={() => setActiveTab('guests')}
              >
                👥 Guests
              </button>
            </>
          )}

          {/* Service Tabs */}
          {selectedBusiness.type === 'service' && (
            <>
              <button
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                👤 Profile
              </button>
              <button
                className={`nav-item ${activeTab === 'availability' ? 'active' : ''}`}
                onClick={() => setActiveTab('availability')}
              >
                ⏰ Availability
              </button>
              <button
                className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('bookings')}
              >
                📋 Bookings
              </button>
              <button
                className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
                onClick={() => setActiveTab('messages')}
              >
                💬 Messages
              </button>
            </>
          )}

          {/* Common Tabs */}
          <div className="nav-divider" />
          <button
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            📈 Analytics
          </button>
          <button
            className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => setActiveTab('messages')}
          >
            💬 Messages
          </button>
          <button
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <OverviewSection business={selectedBusiness} />
        )}
        {activeTab === 'profile' && (
          <ProfileSection business={selectedBusiness} />
        )}
        {activeTab === 'queue' && (
          <QueueSection business={selectedBusiness} />
        )}
        {activeTab === 'bookings' && (
          <BookingsSection business={selectedBusiness} />
        )}
        {activeTab === 'calendar' && (
          <CalendarSection business={selectedBusiness} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsSection business={selectedBusiness} />
        )}
        {activeTab === 'messages' && (
          <MessagesSection business={selectedBusiness} />
        )}
        {activeTab === 'settings' && (
          <SettingsSection business={selectedBusiness} />
        )}
      </div>
    </div>
  )
}

// Placeholder sections
function OverviewSection({ business }) {
  return <div className="section"><h2>Overview</h2><p>Welcome to {business.name}</p></div>
}

function ProfileSection({ business }) {
  return <div className="section"><h2>Profile</h2><p>Edit your {business.type} profile</p></div>
}

function QueueSection({ business }) {
  return <div className="section"><h2>Queue / Requests</h2><p>View live requests</p></div>
}

function BookingsSection({ business }) {
  return <div className="section"><h2>Bookings</h2><p>Manage bookings</p></div>
}

function CalendarSection({ business }) {
  return <div className="section"><h2>Calendar</h2><p>Manage availability</p></div>
}

function AnalyticsSection({ business }) {
  return <div className="section"><h2>Analytics</h2><p>View metrics</p></div>
}

function MessagesSection({ business }) {
  return <div className="section"><h2>Messages</h2><p>Chat with guests/customers</p></div>
}

function SettingsSection({ business }) {
  return <div className="section"><h2>Settings</h2><p>Configure your business</p></div>
}
