import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp, authFetch } from '../context/AppContext'
import './Profile.css'

function hasRealEmail(email) {
  return !!email && !/@gcr\.tourist$/i.test(email)
}

function formatPhone(phone) {
  if (!phone) return null
  const digits = String(phone).replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') return `(${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`
  return String(phone)
}

function daysBetween(a, b) {
  const A = new Date(a); A.setHours(0,0,0,0)
  const B = new Date(b); B.setHours(0,0,0,0)
  return Math.round((B - A) / (1000 * 60 * 60 * 24))
}

export default function Profile() {
  const navigate = useNavigate()
  const { tourist, savedPlaces, itinerary, logout, removeSavedPlace, seenSlugs, resetSeenSlugs, userId, locationSharingEnabled, enableLocationSharing, disableLocationSharing } = useApp()
  const [companionCount, setCompanionCount] = useState(0)
  const [myPhotos, setMyPhotos] = useState([])
  const [photosLoaded, setPhotosLoaded] = useState(false)
  const [togglingLocation, setTogglingLocation] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [accountOpen, setAccountOpen] = useState(false)

  const [addEmailOpen, setAddEmailOpen] = useState(false)
  const [addEmailStep, setAddEmailStep] = useState('input')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [emailErr, setEmailErr] = useState('')
  const [emailInfo, setEmailInfo] = useState('')

  const realEmail = hasRealEmail(tourist?.email) ? tourist.email : null
  const phoneFormatted = formatPhone(tourist?.phone)

  const categories = useMemo(() => {
    const set = new Set()
    savedPlaces.forEach(p => { if (p.category) set.add(p.category) })
    return Array.from(set).sort()
  }, [savedPlaces])

  const filteredSaves = useMemo(() => {
    if (filterCategory === 'all') return savedPlaces
    if (filterCategory === '__super') return savedPlaces.filter(p => p.is_super_like)
    return savedPlaces.filter(p => p.category === filterCategory)
  }, [savedPlaces, filterCategory])

  const superCount = useMemo(() => savedPlaces.filter(p => p.is_super_like).length, [savedPlaces])

  const tripCountdown = useMemo(() => {
    if (!tourist?.arrival) return null
    const today = new Date()
    const arrival = new Date(tourist.arrival)
    const departure = tourist.departure ? new Date(tourist.departure) : null
    const toArrival = daysBetween(today, arrival)
    if (toArrival > 0) {
      return { label: toArrival === 1 ? '1 day until your trip!' : `${toArrival} days until your trip!`, emoji: '✈️' }
    }
    if (departure && daysBetween(today, departure) >= 0) {
      const dayNum = daysBetween(arrival, today) + 1
      const total = daysBetween(arrival, departure) + 1
      return { label: `Day ${dayNum} of ${total} — you're here!`, emoji: '🌊' }
    }
    if (departure && daysBetween(today, departure) < -1) return null
    if (!departure && toArrival < -7) return null
    return { label: 'Welcome back from your trip!', emoji: '👋' }
  }, [tourist?.arrival, tourist?.departure])

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

  async function handleResetDeck() {
    const ok = window.confirm(`Reset your swipe deck? This wipes the ${seenSlugs.length} place${seenSlugs.length === 1 ? '' : 's'} you've seen so they show up again. Saves and Must-Do are NOT affected.`)
    if (!ok) return
    await resetSeenSlugs()
    window.alert(`Done — you'll see all places again.`)
  }

  async function sendAddEmailCode() {
    setEmailBusy(true); setEmailErr(''); setEmailInfo('')
    try {
      const r = await authFetch('/api/tourist-auth/add-email', {
        method: 'POST',
        body: JSON.stringify({ email: newEmail.trim().toLowerCase(), password: newPassword }),
      })
      const d = await r.json()
      if (!r.ok) { setEmailErr(d.error || 'Could not send code'); return }
      setEmailInfo(d.message || 'Code sent — check your inbox.')
      setEmailCode('')
      setAddEmailStep('verify')
    } catch { setEmailErr('Network error — try again.') }
    finally { setEmailBusy(false) }
  }

  async function confirmAddEmail() {
    setEmailBusy(true); setEmailErr(''); setEmailInfo('')
    try {
      const r = await authFetch('/api/tourist-auth/verify-add-email', {
        method: 'POST',
        body: JSON.stringify({ code: emailCode.trim(), password: newPassword }),
      })
      const d = await r.json()
      if (!r.ok) { setEmailErr(d.error || 'Could not confirm'); return }
      setAddEmailOpen(false); setAddEmailStep('input')
      setNewEmail(''); setNewPassword(''); setEmailCode('')
      window.location.reload()
    } catch { setEmailErr('Network error — try again.') }
    finally { setEmailBusy(false) }
  }

  return (
    <div className="profile-page page safe-top safe-bottom">
      <div className="profile-header">
        <div className="profile-avatar">
          {(tourist?.name?.[0] || realEmail?.[0] || phoneFormatted?.[1] || '?').toUpperCase()}
        </div>
        <div style={{minWidth:0,flex:1}}>
          <h2>{tourist?.name || 'Traveler'}</h2>
          <p className="profile-phone">
            {phoneFormatted ? `📱 ${phoneFormatted}` : realEmail ? `✉️ ${realEmail}` : 'Not set'}
          </p>
          {phoneFormatted && realEmail && (
            <p style={{margin:'2px 0 0',fontSize:12,color:'rgba(255,255,255,.55)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>✉️ {realEmail}</p>
          )}
        </div>
        <button className="edit-btn" onClick={() => navigate('/setup/name')}>Edit</button>
      </div>

      {tripCountdown && (
        <div style={{background:'linear-gradient(135deg,rgba(124,106,247,.18),rgba(14,165,233,.12))',border:'1px solid rgba(124,106,247,.3)',borderRadius:14,padding:'12px 14px',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:22}}>{tripCountdown.emoji}</span>
          <span style={{fontWeight:700,color:'#fff',fontSize:14}}>{tripCountdown.label}</span>
        </div>
      )}

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
        <div className="stat-box" onClick={() => navigate('/list')} style={{cursor:'pointer'}}>
          <div className="stat-num">{savedPlaces.length}</div>
          <div className="stat-label">Saved</div>
        </div>
        <div className="stat-box" onClick={() => navigate('/itinerary')} style={{cursor:'pointer'}}>
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
          <span>My Saves</span>
          {savedPlaces.length > 0 && (
            <span style={{fontSize:13,color:'rgba(255,255,255,.6)'}}>
              {savedPlaces.length}{superCount > 0 ? ` · ⭐ ${superCount} must-do` : ''}
            </span>
          )}
        </h3>

        {savedPlaces.length > 0 && (categories.length > 0 || superCount > 0) && (
          <div style={{display:'flex',gap:6,overflowX:'auto',paddingBottom:8,marginBottom:8,scrollbarWidth:'none'}}>
            <button onClick={() => setFilterCategory('all')} style={{flexShrink:0,padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,border:`1px solid ${filterCategory==='all'?'rgba(124,106,247,.6)':'rgba(255,255,255,.15)'}`,background:filterCategory==='all'?'rgba(124,106,247,.18)':'transparent',color:filterCategory==='all'?'#c4b5fd':'rgba(255,255,255,.7)'}}>
              All
            </button>
            {superCount > 0 && (
              <button onClick={() => setFilterCategory('__super')} style={{flexShrink:0,padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,border:`1px solid ${filterCategory==='__super'?'rgba(252,211,77,.6)':'rgba(255,255,255,.15)'}`,background:filterCategory==='__super'?'rgba(252,211,77,.15)':'transparent',color:filterCategory==='__super'?'#fcd34d':'rgba(255,255,255,.7)'}}>
                ⭐ Must Do
              </button>
            )}
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilterCategory(cat)} style={{flexShrink:0,padding:'6px 12px',borderRadius:20,fontSize:12,fontWeight:600,border:`1px solid ${filterCategory===cat?'rgba(124,106,247,.6)':'rgba(255,255,255,.15)'}`,background:filterCategory===cat?'rgba(124,106,247,.18)':'transparent',color:filterCategory===cat?'#c4b5fd':'rgba(255,255,255,.7)',textTransform:'capitalize'}}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {savedPlaces.length === 0 ? (
          <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:20,textAlign:'center'}}>
            <div style={{fontSize:32,marginBottom:8}}>💫</div>
            <div style={{color:'rgba(255,255,255,.8)',marginBottom:12}}>No saves yet</div>
            <button className="btn-primary" onClick={() => navigate('/home')} style={{padding:'10px 18px'}}>Start Swiping</button>
          </div>
        ) : filteredSaves.length === 0 ? (
          <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:20,textAlign:'center',color:'rgba(255,255,255,.6)',fontSize:13}}>
            Nothing in this category yet.
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {filteredSaves.map(p => (
              <div key={p.id} style={{position:'relative',background:'rgba(255,255,255,.04)',border:`1px solid ${p.is_super_like?'rgba(252,211,77,.35)':'rgba(255,255,255,.08)'}`,borderRadius:12,padding:10,display:'flex',alignItems:'center',gap:12}}>
                {p.is_super_like && (
                  <span title="Must Do" style={{position:'absolute',top:-6,left:-6,background:'#fcd34d',color:'#78350f',fontSize:11,fontWeight:800,padding:'2px 6px',borderRadius:8,boxShadow:'0 2px 6px rgba(0,0,0,.3)'}}>⭐</span>
                )}
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
                    {p.category ? `${p.rating || p.price_range ? ' · ' : ''}${p.category}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => removeSavedPlace(p.id)}
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

      <div style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:20,overflow:'hidden'}}>
        <button
          onClick={() => setAccountOpen(o => !o)}
          style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:16,fontSize:15,fontWeight:600,color:'#fff',background:'transparent',textAlign:'left',border:'none'}}
        >
          <span style={{fontSize:18}}>👤</span>
          <span>Account</span>
          <span style={{marginLeft:'auto',color:'rgba(255,255,255,.5)',fontSize:18,transform:accountOpen?'rotate(90deg)':'none',transition:'transform 0.15s'}}>›</span>
        </button>
        {accountOpen && (
          <div style={{padding:'4px 16px 16px',display:'flex',flexDirection:'column',gap:0,borderTop:'1px solid var(--border)'}}>
            {phoneFormatted && (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0'}}>
                <div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,.55)',marginBottom:2}}>Phone</div>
                  <div style={{fontWeight:600}}>📱 {phoneFormatted}</div>
                </div>
                <span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:10,background:'rgba(34,197,94,.15)',color:'#86efac'}}>VERIFIED</span>
              </div>
            )}

            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',borderTop:phoneFormatted?'1px solid var(--border)':'none'}}>
              <div style={{minWidth:0,flex:1}}>
                <div style={{fontSize:12,color:'rgba(255,255,255,.55)',marginBottom:2}}>Email</div>
                <div style={{fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                  {realEmail ? `✉️ ${realEmail}` : <span style={{color:'rgba(255,255,255,.55)'}}>Not set</span>}
                </div>
              </div>
              {!realEmail && !addEmailOpen && (
                <button className="btn-primary" style={{padding:'8px 14px',fontSize:13,marginLeft:10,flexShrink:0}} onClick={() => { setAddEmailOpen(true); setEmailErr(''); setEmailInfo('') }}>Add</button>
              )}
            </div>

            {addEmailOpen && (
              <div style={{background:'rgba(124,106,247,.08)',border:'1px solid rgba(124,106,247,.25)',borderRadius:12,padding:14,marginTop:8}}>
                {addEmailStep === 'input' ? (
                  <>
                    <div style={{fontWeight:700,marginBottom:6,fontSize:14}}>Add email + password</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,.6)',marginBottom:10}}>So you can also sign in by email and recover your account if you lose your phone.</div>
                    <input
                      type="email" placeholder="you@email.com" value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="setup-input" autoComplete="email" style={{fontSize:16,marginBottom:8,width:'100%',boxSizing:'border-box'}}
                    />
                    <input
                      type="password" placeholder="Password (6+ characters)" value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="setup-input" autoComplete="new-password" style={{fontSize:16,width:'100%',boxSizing:'border-box'}}
                    />
                    {emailErr && <div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',borderRadius:10,padding:'8px 12px',fontSize:13,color:'#fca5a5',marginTop:10}}>{emailErr}</div>}
                    {emailInfo && <div style={{background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.3)',borderRadius:10,padding:'8px 12px',fontSize:13,color:'#86efac',marginTop:10}}>{emailInfo}</div>}
                    <div style={{display:'flex',gap:8,marginTop:12}}>
                      <button className="btn-primary" onClick={sendAddEmailCode} disabled={emailBusy || !newEmail || newPassword.length < 6} style={{flex:1}}>
                        {emailBusy ? 'Sending…' : 'Send code →'}
                      </button>
                      <button onClick={() => { setAddEmailOpen(false); setEmailErr(''); setEmailInfo('') }} style={{background:'transparent',border:'1px solid rgba(255,255,255,.2)',color:'#fff',borderRadius:10,padding:'10px 14px'}}>Cancel</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{fontWeight:700,marginBottom:8,fontSize:14}}>Enter the 6-digit code we emailed to <span style={{color:'#fff'}}>{newEmail}</span></div>
                    <input
                      type="text" inputMode="numeric" maxLength={6} placeholder="6-digit code" value={emailCode}
                      onChange={e => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="setup-input" style={{fontSize:20,letterSpacing:6,textAlign:'center',width:'100%',boxSizing:'border-box'}}
                    />
                    {emailErr && <div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.3)',borderRadius:10,padding:'8px 12px',fontSize:13,color:'#fca5a5',marginTop:10}}>{emailErr}</div>}
                    {emailInfo && <div style={{background:'rgba(34,197,94,.1)',border:'1px solid rgba(34,197,94,.3)',borderRadius:10,padding:'8px 12px',fontSize:13,color:'#86efac',marginTop:10}}>{emailInfo}</div>}
                    <div style={{display:'flex',gap:8,marginTop:12}}>
                      <button className="btn-primary" onClick={confirmAddEmail} disabled={emailBusy || emailCode.length < 6} style={{flex:1}}>
                        {emailBusy ? 'Confirming…' : 'Confirm →'}
                      </button>
                      <button onClick={() => setAddEmailStep('input')} style={{background:'transparent',border:'1px solid rgba(255,255,255,.2)',color:'#fff',borderRadius:10,padding:'10px 14px'}}>Back</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

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
        <button className="profile-action" onClick={handleResetDeck}>
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
