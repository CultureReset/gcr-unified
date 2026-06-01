import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import GCRHeader from '../components/GCRHeader'
import Toast from '../components/Toast'
import { SkeletonGrid } from '../components/SkeletonLoader'
import { unsaveItem } from '../services/gcrApi'
import { API_BASE } from '../config'
import './Saves.css'

export default function Saves() {
  const navigate = useNavigate()
  const { userId } = useApp()
  const [saves, setSaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!userId) {
      navigate('/auth')
      return
    }

    async function loadSaves() {
      try {
        setLoading(true)
        setError(null)
        const token = localStorage.getItem('gcr_access_token')
        if (!token) {
          navigate('/auth')
          return
        }

        const res = await fetch(`${API_BASE}/api/tourist/saves`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (res.ok) {
          const data = await res.json()
          setSaves(data.saves || [])
        } else {
          setError('Failed to load saved items')
          setSaves([])
        }
      } catch (err) {
        console.error('Error loading saves:', err)
        setError('Connection error. Please try again.')
        setSaves([])
      } finally {
        setLoading(false)
      }
    }

    loadSaves()
  }, [userId, navigate])

  const handleRemove = async (slug) => {
    try {
      await unsaveItem(slug)
      setSaves(prev => prev.filter(s => s.slug !== slug && s.entity_slug !== slug))
      setToast({ message: 'Removed from saved', type: 'success' })
    } catch (err) {
      setToast({ message: 'Failed to remove save', type: 'error' })
    }
  }

  return (
    <div className="saves-page">
      <GCRHeader />

      <div className="saves-hero">
        <h1>❤️ Saved Places</h1>
        <p>{saves.length} item{saves.length !== 1 ? 's' : ''} saved</p>
      </div>

      <div className="saves-content">
        {loading ? (
          <SkeletonGrid count={4} />
        ) : error ? (
          <div className="empty-state" style={{background:'rgba(239,68,68,0.1)',borderRadius:'12px',padding:'40px 20px'}}>
            <p style={{fontSize:'28px',marginBottom:'12px'}}>⚠️</p>
            <p style={{fontWeight:600,marginBottom:'8px'}}>Couldn't Load Saves</p>
            <p style={{fontSize:'13px',color:'var(--text2)'}}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{marginTop:'12px',padding:'8px 16px',background:'var(--accent)',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'14px'}}
            >
              Try Again
            </button>
          </div>
        ) : saves.length === 0 ? (
          <div className="empty-state" style={{padding:'60px 20px'}}>
            <p style={{fontSize:'40px',marginBottom:'12px'}}>💾</p>
            <p style={{fontWeight:600,marginBottom:'8px'}}>No saved places yet</p>
            <p style={{fontSize:'13px',color:'var(--text2)',marginBottom:'20px'}}>Save restaurants, events, and activities to your list</p>
            <button
              onClick={() => navigate('/search')}
              style={{padding:'10px 20px',background:'var(--primary)',color:'white',border:'none',borderRadius:'8px',cursor:'pointer',fontSize:'14px',fontWeight:600}}
            >
              Browse Places →
            </button>
          </div>
        ) : (
          <div className="saves-grid">
            {saves.map(item => (
              <div key={item.slug || item.entity_slug} className="save-card">
                {item.hero_image_url && (
                  <img src={item.hero_image_url} alt={item.name || item.business_name} className="save-image" />
                )}
                <div className="save-content">
                  <h3 className="save-name">{item.name || item.business_name}</h3>
                  {item.subtitle && <p className="save-subtitle">{item.subtitle}</p>}
                  {item.category && <p className="save-category">{item.category}</p>}
                  <div className="save-actions">
                    <button
                      className="save-btn primary"
                      onClick={() => navigate(`/business/${item.slug || item.entity_slug}`)}
                    >
                      View Details
                    </button>
                    <button
                      className="save-btn danger"
                      onClick={() => handleRemove(item.slug || item.entity_slug)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
    </div>
  )
}
