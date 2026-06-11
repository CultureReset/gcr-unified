import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import PageHeader from '../components/PageHeader'
import Toast from '../components/Toast'
import { getPlaceSlug } from '../utils/savedPlaces'
import './Saves.css'

export default function Saves() {
  const navigate = useNavigate()
  const { savedPlaces, removeSavedPlace } = useApp()
  const [toast, setToast] = useState(null)

  const handleRemove = async (place) => {
    try {
      await removeSavedPlace(place)
      setToast({ message: 'Removed from saved', type: 'success' })
    } catch (error) {
      setToast({ message: error.message || 'Failed to remove save', type: 'error' })
    }
  }

  return (
    <div className="saves-page">
      <PageHeader title="❤️ Saved Places" subtitle={`${savedPlaces.length} item${savedPlaces.length !== 1 ? 's' : ''} saved`} showBack={true} />

      <div className="saves-content">
        {savedPlaces.length === 0 ? (
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
            {savedPlaces.map(item => {
              const slug = getPlaceSlug(item)
              return (
                <div key={slug} className="save-card">
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
                        onClick={() => navigate(`/business/${slug}`)}
                      >
                        View Details
                      </button>
                      <button
                        className="save-btn danger"
                        onClick={() => handleRemove(item)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
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
