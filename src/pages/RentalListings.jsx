/**
 * STAYING PAGE  —  /staying
 * Hotels · Condos · Vacation Rentals · RV Parks · B&B
 * Reads from entity table via /api/gcr/entities
 */
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { API_BASE } from '../config'
import './RentalListings.css'

const TYPE_TABS = [
  { id: 'all',              label: 'All Stays',        emoji: '🏨', types: null },
  { id: 'hotel',            label: 'Hotels',           emoji: '🏨', types: ['hotel'] },
  { id: 'condo',            label: 'Condos',           emoji: '🏠', types: ['condo'] },
  { id: 'vacation-rental',  label: 'Vacation Rentals', emoji: '🏖️', types: ['vacation-rental'] },
  { id: 'rv',               label: 'RV Parks',         emoji: '🚐', types: ['rv_park'] },
  { id: 'bnb',              label: 'B&B',              emoji: '🛏️', types: ['bed_and_breakfast','guest_house'] },
]

const SORT_OPTIONS = [
  { id: 'default',  label: 'Featured' },
  { id: 'price_asc',label: 'Price: Low' },
  { id: 'rating',   label: 'Top Rated' },
  { id: 'name',     label: 'A–Z' },
]

function StayCard({ entity, navigate, savedSlugs, onSave }) {
  const img = entity.hero_image_url
  const slug = entity.slug
  const beds = entity.bedrooms_min || entity.bedrooms_max
  const sleeps = entity.sleeps_min || entity.sleeps_max
  const price = entity.price_from
  const rating = entity.rating ? parseFloat(entity.rating).toFixed(1) : null
  const isSaved = savedSlugs?.has(slug)

  const typeLabel = {
    'hotel': '🏨 Hotel', 'resort_hotel': '🏨 Resort', 'motel': '🏨 Motel',
    'condo': '🏠 Condo', 'condominium_complex': '🏠 Condo Complex',
    'vacation-rental': '🏖️ Vacation Rental', 'rv_park': '🚐 RV Park',
    'bed_and_breakfast': '🛏️ B&B', 'guest_house': '🛏️ Guest House',
    'cottage': '🏡 Cottage', 'resort': '🌴 Resort',
  }[entity.entity_subtype] || '🏨 Lodging'

  return (
    <article className="stay-card" onClick={() => navigate(`/business/${slug}`)}>
      <div className="stay-card-img">
        {img
          ? <img src={img} alt={entity.name} loading="lazy" />
          : <div className="stay-card-img-placeholder">🏨</div>
        }
        <div className="stay-type-badge">{typeLabel}</div>
        {price && <div className="stay-price-badge">${Math.round(price)}<span>/night</span></div>}
        <button
          className={`stay-save-btn ${isSaved ? 'saved' : ''}`}
          onClick={e => { e.stopPropagation(); onSave(entity) }}
        >{isSaved ? '❤️' : '🤍'}</button>
      </div>
      <div className="stay-card-body">
        <div className="stay-card-name">{entity.name}</div>
        <div className="stay-card-location">{entity.city || 'Gulf Coast'}</div>
        <div className="stay-card-specs">
          {beds && <span>🛏️ {beds}{entity.bedrooms_max && entity.bedrooms_max !== beds ? `–${entity.bedrooms_max}` : ''} bed</span>}
          {sleeps && <span>👥 Sleeps {sleeps}</span>}
          {entity.pool && <span>🏊 Pool</span>}
          {entity.pet_friendly && <span>🐾 Pets OK</span>}
        </div>
        {rating && (
          <div className="stay-card-rating">
            ⭐ {rating}
            {entity.review_count > 0 && <span className="stay-review-count">({entity.review_count.toLocaleString()})</span>}
          </div>
        )}
        <button className="stay-view-btn">View →</button>
      </div>
    </article>
  )
}

export default function RentalListings() {
  const navigate = useNavigate()
  const { savedPlaces, addSavedPlace, removeSavedPlace } = useApp()
  const [entities, setEntities] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState('all')
  const [sort, setSort] = useState('default')
  const [search, setSearch] = useState('')
  const savedSlugs = new Set((savedPlaces || []).map(p => p.slug))

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Pull hotels, condos, vacation-rentals, rv_parks from entity table
        const STAY_TYPES = ['hotel','condo','vacation-rental']
        const STAY_SUBTYPES = ['hotel','resort_hotel','motel','bed_and_breakfast','guest_house',
          'condominium_complex','condo','apartment_complex','vacation-rental','rv_park','cottage','resort']
        
        let all = [], offset = 0
        while (true) {
          const res = await fetch(`${API_BASE}/api/gcr/entities?limit=1000&offset=${offset}`)
          if (!res.ok) break
          const data = await res.json()
          const batch = data.entities || []
          all = all.concat(batch)
          if (batch.length < 1000) break
          offset += 1000
        }

        const stays = all.filter(e => {
          const et = (e.entity_type || '').toLowerCase()
          const es = (e.entity_subtype || '').toLowerCase()
          if (STAY_TYPES.includes(et)) return true
          if (STAY_SUBTYPES.includes(es)) return true
          if (et === 'service' && ['lodging','apartment_building','private_guest_room'].includes(es)) return true
          return false
        })

        // Deduplicate by name
        const seen = new Map()
        stays.forEach(e => {
          const key = (e.name || '').trim().toLowerCase()
          if (!seen.has(key) || (e.hero_image_url && !seen.get(key).hero_image_url)) {
            seen.set(key, e)
          }
        })
        setEntities(Array.from(seen.values()))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = useCallback(async (entity) => {
    const slug = entity.slug
    if (savedSlugs.has(slug)) {
      const item = savedPlaces?.find(p => p.slug === slug)
      if (item) await removeSavedPlace(item.id)
    } else {
      await addSavedPlace(entity)
    }
  }, [savedPlaces, savedSlugs, addSavedPlace, removeSavedPlace])

  // Filter
  const tab = TYPE_TABS.find(t => t.id === activeType)
  let filtered = entities.filter(e => {
    if (tab?.types) {
      const et = (e.entity_type || '').toLowerCase()
      const es = (e.entity_subtype || '').toLowerCase()
      return tab.types.some(t => et.includes(t) || es.includes(t))
    }
    return true
  })

  // Search
  if (search.trim()) {
    const q = search.toLowerCase()
    filtered = filtered.filter(e =>
      (e.name || '').toLowerCase().includes(q) ||
      (e.city || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q)
    )
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    if (sort === 'price_asc') return (a.price_from || 9999) - (b.price_from || 9999)
    if (sort === 'rating') return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)
    if (sort === 'name') return (a.name || '').localeCompare(b.name || '')
    return (b.hero_image_url ? 1 : 0) - (a.hero_image_url ? 1 : 0)
  })

  // Counts per tab
  const counts = {}
  TYPE_TABS.forEach(t => {
    if (!t.types) { counts[t.id] = entities.length; return }
    counts[t.id] = entities.filter(e => {
      const et = (e.entity_type || '').toLowerCase()
      const es = (e.entity_subtype || '').toLowerCase()
      return t.types.some(tt => et.includes(tt) || es.includes(tt))
    }).length
  })

  return (
    <div className="staying-page">
      {/* Hero */}
      <div className="staying-hero">
        <div className="staying-hero-inner">
          <h1>🏨 Where to Stay</h1>
          <p>Hotels, condos, vacation rentals, RV parks and B&Bs on Alabama's Gulf Coast</p>
          <div className="staying-hero-stats">
            <span><b>{counts.hotel || 0}</b> Hotels</span>
            <span><b>{counts.condo || 0}</b> Condos</span>
            <span><b>{counts['vacation-rental'] || 0}</b> Rentals</span>
            <span><b>{counts.rv || 0}</b> RV Parks</span>
          </div>
        </div>
      </div>

      {/* Type toggle */}
      <div className="staying-type-bar">
        {TYPE_TABS.map(t => (
          <button
            key={t.id}
            className={`staying-type-btn ${activeType === t.id ? 'active' : ''}`}
            onClick={() => setActiveType(t.id)}
          >
            {t.emoji} {t.label}
            {counts[t.id] > 0 && <span className="staying-type-count">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      {/* Search + Sort */}
      <div className="staying-controls">
        <div className="staying-search-wrap">
          <span className="staying-search-icon">🔍</span>
          <input
            className="staying-search"
            placeholder="Search by name, city, type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="staying-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <select className="staying-sort" value={sort} onChange={e => setSort(e.target.value)}>
          {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
        <span className="staying-count">{filtered.length} listings</span>
      </div>

      {/* Grid */}
      <div className="staying-content">
        {loading ? (
          <div className="staying-loading">
            <div className="staying-spinner" />
            <p>Loading stays...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="staying-empty">
            <div style={{fontSize:'3rem'}}>🏨</div>
            <p>No listings found{search ? ` for "${search}"` : ''}</p>
            {search && <button onClick={() => setSearch('')}>Clear search</button>}
          </div>
        ) : (
          <div className="stay-grid">
            {filtered.map(e => (
              <StayCard
                key={e.id || e.slug}
                entity={e}
                navigate={navigate}
                savedSlugs={savedSlugs}
                onSave={handleSave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
