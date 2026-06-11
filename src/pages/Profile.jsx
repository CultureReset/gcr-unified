import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, authFetch } from '../context/AppContext'
import './Profile.css'

export default function Profile() {
  const navigate = useNavigate()
  const { tourist, savedPlaces, itinerary, logout, removeSavedPlace, seenSlugs, resetSeenSlugs, userId, locationSharingEnabled, enableLocationSharing, disableLocationSharing } = useApp()
  const [companionCount, setCompanionCount] = useState(0)
  const [myPhotos, setMyPhotos] = useState([])
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const [togglingLocation, setTogglingLocation] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [groupsRes, photosRes] = await Promise.all([
          authFetch('/api/tourist/groups'),
          authFetch('/api/tourist/photos'),
        ])
        if (!cancelled && groupsRes?.ok) {
          const { groups = [] } = await groupsRes.json()
          const others = new Set()
          groups.forEach(g => (g.members || []).forEach(m => { if (m.user_id && m.user_id !== userId) others.add(m.user_id) }))
          setCompanionCount(others.size)
        }
        if (!cancelled && photosRes?.ok) {
          const { photos = [] } = await photosRes.json()
          setMyPhotos(photos)
        }
        if (!cancelled) setPhotosLoaded(true)
      } catch (e) { if (!cancelled) setPhotosLoaded(true) }
    })()
    return () => { cancelled = true }
  }, [userId])

  function handleLogout() {
    logout()
    navigate('/')
  }

  async function handleToggleLocation() {
    setTogglingLocation(true)
    try {
      if (locationSharingEnabled) {
        await disableLocationSharing()
      } else {
        await enableLocationSharing({
          geofence_radius_miles: 1.0,
          sms_frequency: 'once_per_day',
          sms_categories: ['food', 'nightlife', 'activities', 'stay']
        })
      }
    } catch (e) {
      console.error('Error toggling location sharing:', e)
    } finally {
      setTogglingLocation(false)
    }
  }

  return (
    <div className="profile-page page safe-top safe-bottom">
      <div className="profile-header">
        <div className="profile-avatar">
          {(tourist?.name?.[0] || tourist?.email?.[0] || '?').toUpperCase()}
        </div>
        <div>
          <h2>{tourist?.name || 'Traveler'}</h2>
          <p className="profile-phone">✉️ {tourist?.email || 'Not set'}</p>
        </div>
        <button className="edit-btn" onClick={() => navigate('/setup/name')}>Edit</button>
      </div>

      <div className="profile-trip-card">
        <div className="trip-card-header">
          <span>Current Trip</span>
          <span className="trip-dest">{tourist?.destination || 'Not set'}</span>
        </div>
        <div className="trip-card-dates">
          <div className="trip-date">
            <div className="trip-date-label">Arrival</div>
            <div className="trip-date-val">{tourist?.arrival ? new Date(tourist.arrival).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}</div>
          </div>
          <div className="trip-date-arrow">→</div>
          <div className="trip-date">
            <div className="trip-date-label">Departure</div>
            <div className="trip-date-val">{tourist?.departure ? new Date(tourist.departure).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}</div>
          </div>
          <div className="trip-date">
            <div className="trip-date-label">Days</div>
            <div className="trip-date-val">{tourist?.trip_days || '—'}</div>
          </div>
        </div>
        <div className="trip-details">
          <div className="trip-detail">
            <span>👥</span>
            <span style={{textTransform:'capitalize'}}>{tourist?.group_type || 'Not set'}</span>
          </div>
          <div className="trip-detail">
            <span>💰</span>
            <span>{tourist?.budget || 'Not set'}</span>
          </div>
          <div className="trip-detail">
            <span>🏨</span>
            <span>{tourist?.hotel_name || (tourist?.stay_status === 'looking' ? 'Still looking' : tourist?.stay_status === 'other' ? 'With friends' : 'Not set')}</span>
          </div>
        </div>
        <button className="trip-edit-btn" onClick={() => navigate('/setup/arrival')}>Update Trip Details</button>
      </div>

      <div className="profile-stats">
        <div className="stat-box">
          <div className="stat-num">{savedPlaces.length}</div>
          <div className="stat-label">Saved Places</div>
        </div>
        <div className="stat-box">
          <div className="stat-num">{itinerary ? itinerary.days.length : 0}</div>
          <div className="stat-label">Days Planned</div>
        </div>
        <div className="stat-box" onClick={() => navigate('/groups')} style={{cursor:'pointer'}}>
          <div className="stat-num">{companionCount}</div>
          <div className="stat-label">Companions</div>
        </div>
      </div>

      <div className="profile-interests">
        <h3>Your Interests</h3>
        <div className="interest-display">
          {tourist?.interests?.map(tag => (
            <span key={tag} className="interest-pill">{tag}</span>
          )) || <span className="no-interests">None set yet</span>}
        </div>
        <button className="edit-interests-btn" onClick={() => navigate('/setup/interests')}>Edit Interests</button>
      </div>

      <div style={{margin:'20px 0',background:'rgba(14,165,233,.08)',border:'1px solid rgba(14,165,233,.2)',borderRadius:14,padding:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <h3 style={{margin:0,display:'flex',alignItems:'center',gap:8}}>
            <span>📍</span>
            <span>Location & Offers</span>
          </h3>
          <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
            <input
              type="checkbox"
              checked={locationSharingEnabled}
              onChange={handleToggleLocation}
              disabled={togglingLocation}
              style={{cursor:'pointer',width:18,height:18}}
            />
            <span style={{fontSize:12,color:'rgba(255,255,255,.7)'}}>
              {togglingLocation ? 'Updating...' : locationSharingEnabled ? 'On' : 'Off'}
            </span>
          </label>
        </div>
        {locationSharingEnabled ? (
          <div style={{fontSize:13,color:'rgba(14,165,233,.9)',lineHeight:1.6}}>
            ✅ You'll get SMS offers when you're near places you've shown interest in. We use your location every 30 seconds and delete location history after 30 days.
            <div style={{marginTop:12,fontSize:12,color:'rgba(255,255,255,.5)'}}>
              📍 Radius: 1 mile | 📨 Frequency: Once per day | 🔒 Privacy-first
            </div>
          </div>
        ) : (
          <div style={{fontSize:13,color:'rgba(255,255,255,.6)',lineHeight:1.6}}>
            Enable location sharing to receive personalized SMS offers for places you'll love, sent when you're nearby.
          </div>
        )}
      </div>

      <div style={{margin:'20px 0'}}>
        <h3 style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <span>My Recommendations</span>
          {savedPlaces.length > 0 && <span style={{fontSize:13,color:'rgba(255,255,255,.6)'}}>{savedPlaces.length} saved</span>}
        </h3>
        {savedPlaces.length === 0 ? (
          <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:20,textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:8}}>💫</div>
            <div style={{color:'rgba(255,255,255,.8)',marginBottom:12}}>No recommendations yet</div>
            <button className="btn-primary" onClick={() => navigate('/home')} style={{padding:'10px 18px'}}>Start Swiping</button>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {savedPlaces.map(p => (
              <div key={p.id} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:12,padding:10,display:'flex',alignItems:'center',gap:12}}>
                {p.hero_image_url && (
                  <img src={p.hero_image_url} alt="" style={{width:64,height:64,borderRadius:10,objectFit:'cover',flexShrink:0,cursor:'pointer'}} onClick={() => navigate(`/business/${p.slug}`)} />
                )}
                <div style={{flex:1,minWidth:0,cursor:'pointer'}} onClick={() => navigate(`/business/${p.slug}`)}>
                  <div style={{fontWeight:700,color:'#fff',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.name}</div>
                  {p.subtitle && <div style={{fontSize:12,color:'rgba(255,255,255,.6)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.subtitle}</div>}
                  <div style={{fontSize:11,color:'rgba(255,255,255,.45)',marginTop:2}}>
                    {p.rating ? `⭐ ${p.rating}` : ''}
                    {p.rating && p.price_range ? ' · ' : ''}
                    {p.price_range || ''}
                  </div>
                </div>
                <button
                  onClick={() => removeSavedPlace(p)}
                  style={{background:'none',border:'none',color:'rgba(255,255,255,.5)',fontSize:18,cursor:'pointer',padding:8}}
                  aria-label="Remove"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {photosLoaded && (
        <div style={{margin:'20px 0'}}>
          <h3 style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <span>My Photos</span>
            {myPhotos.length > 0 && <span style={{fontSize:13,color:'rgba(255,255,255,.6)'}}>{myPhotos.length} submitted</span>}
          </h3>
          {myPhotos.length === 0 ? (
            <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:20,textAlign:'center'}}>
              <div style={{fontSize:32,marginBottom:8}}>📸</div>
              <div style={{color:'rgba(255,255,255,.7)',fontSize:14}}>No photos yet</div>
              <div style={{color:'rgba(255,255,255,.4)',fontSize:12,marginTop:4}}>Photos you share after visiting places will appear here</div>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6}}>
              {myPhotos.map(p => (
                <div key={p.id} style={{position:'relative',aspectRatio:'1',borderRadius:10,overflow:'hidden',background:'rgba(255,255,255,.06)',cursor:'pointer'}}
                  onClick={() => navigate(`/business/${p.entity_slug}`)}>
                  <img src={p.image_url} alt={p.caption || ''} style={{width:'100%',height:'100%',objectFit:'cover'}}
                    onError={e => { e.target.style.display='none' }} />
                  <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'4px 6px',background:'rgba(0,0,0,.6)'}}>
                    <span style={{fontSize:9,fontWeight:600,color:p.status==='approved'?'#86efac':p.status==='rejected'?'#fca5a5':'#fcd34d',textTransform:'uppercase',letterSpacing:.5}}>
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="profile-actions">
        <button className="profile-action" onClick={() => navigate('/home')}>
          <span>🧭</span>
          <span>Discover More</span>
          <span className="chevron">›</span>
        </button>
        <button className="profile-action" onClick={() => navigate('/list')}>
          <span>❤️</span>
          <span>My Saved Places</span>
          <span className="chevron">›</span>
        </button>
        <button className="profile-action" onClick={() => navigate('/itinerary')}>
          <span>🗺️</span>
          <span>My Itinerary</span>
          <span className="chevron">›</span>
        </button>
        <button className="profile-action" onClick={() => navigate('/groups')}>
          <span>👥</span>
          <span>Group Trips</span>
          <span className="chevron">›</span>
        </button>
        <button className="profile-action" onClick={async () => {
          await resetSeenSlugs()
          alert(`Swipe deck reset — you'll see all ${savedPlaces.length > 0 ? 'places' : 'businesses'} again`)
        }}>
          <span>🔄</span>
          <span>Reset Swipe Deck {seenSlugs.length > 0 ? `(${seenSlugs.length} seen)` : ''}</span>
          <span className="chevron">›</span>
        </button>
        <button className="profile-action danger" onClick={handleLogout}>
          <span>🚪</span>
          <span>Sign Out</span>
          <span className="chevron">›</span>
        </button>
      </div>
    </div>
  )
}
