import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GCRCard from '../components/GCRCard'
import { API_BASE } from '../config'
import './CategoryListings.css'

const CATEGORY_META = {
  restaurants:     { label: 'Restaurants',     emoji: '🍽️', desc: 'Dining, bars & local eats' },
  'coffee-sweets': { label: 'Coffee & Sweets', emoji: '☕', desc: 'Coffee shops, bakeries & ice cream' },
  'happy-hours':   { label: 'Happy Hours',     emoji: '🍻', desc: 'Deals on drinks & bites' },
  'things-to-do':  { label: 'Things To Do',    emoji: '🎯', desc: 'Activities, tours & attractions' },
  services:        { label: 'Services',         emoji: '🛠️', desc: 'Local service providers' },
  'public-spots':  { label: 'Public Spots',     emoji: '✨', desc: 'Parks, beaches & public spaces' },
  shopping:        { label: 'Shopping',          emoji: '🛍️', desc: 'Retail, boutiques & souvenirs' },
  staying:         { label: 'Staying',           emoji: '🏨', desc: 'Hotels, condos & vacation rentals' },
  nightlife:       { label: 'Nightlife',         emoji: '🌙', desc: 'Bars, clubs & late-night spots' },
}

const TYPE_MAP = {
  restaurants: 'restaurant',
  'coffee-sweets': 'coffee',
  'happy-hours': 'restaurant',
  'things-to-do': 'activity',
  services: 'service',
  'public-spots': 'public_spot',
  shopping: 'shopping',
  staying: 'hotel',
  nightlife: 'nightlife',
}

export default function CategoryListings() {
  const { category } = useParams()
  const navigate = useNavigate()
  const [entities, setEntities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [savedSlugs, setSavedSlugs] = useState(new Set())
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const gridRef = useRef(null)

  const meta = CATEGORY_META[category] || { label: category, emoji: '📍', desc: '' }
  const apiType = TYPE_MAP[category] || category

  useEffect(() => {
    async function loadEntities() {
      setLoading(true)
      setError(null)
      try {
        let url = `${API_BASE}/api/gcr/entities?limit=500`
        if (category === 'happy-hours') {
          url = `${API_BASE}/api/gcr/happy-hours`
        } else {
          url += `&type=${apiType}`
        }
        const res = await fetch(url)
        if (!res.ok) throw new Error('Failed to load')
        const data = await res.json()
        setEntities(data.entities || data.businesses || data || [])
      } catch (err) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadEntities()
  }, [category])

  const handleSave = (entity) => {
    const slug = entity.slug || entity.id
    setSavedSlugs(prev => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }

  const searchLower = search.toLowerCase()
  const filtered = entities.filter(e => {
    const matchSearch = !search ||
      (e.name || '').toLowerCase().includes(searchLower) ||
      (e.description || '').toLowerCase().includes(searchLower) ||
      (e.city || '').toLowerCase().includes(searchLower)
    const matchFilter =
      activeFilter === 'all' ? true :
      activeFilter === 'open' ? true :
      activeFilter === 'hh' ? !!e.hh_days :
      activeFilter === 'music' ? !!e.live_music :
      true
    return matchSearch && matchFilter
  })

  return (
    <div className="category-listings">
      {/* Hero */}
      <div className="listings-hero">
        <button className="back-btn" onClick={() => navigate(-1)}>←</button>
        <div className="hero-text">
          <h1>{meta.emoji} {meta.label}</h1>
          <p>{meta.desc} · <strong>{entities.length}</strong> spots</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="listings-toolbar">
        <input
          className="listings-search"
          type="text"
          placeholder={`Search ${meta.label.toLowerCase()}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="listings-filters">
          {['all', 'hh', 'music'].map(f => (
            <button
              key={f}
              className={`filter-btn ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'hh' ? '🍺 Happy Hour' : '🎸 Live Music'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="listings-loading">
          <div className="skeleton-grid">
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton-card" />)}
          </div>
        </div>
      ) : error ? (
        <div className="listings-error">⚠️ {error}</div>
      ) : filtered.length === 0 ? (
        <div className="listings-empty">
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>{meta.emoji}</div>
          <div style={{ fontWeight: 700 }}>No results found</div>
          {search && <div style={{ fontSize: 13, color: '#66788a', marginTop: 8 }}>Try a different search</div>}
        </div>
      ) : (
        <div className="listings-grid" ref={gridRef}>
          {filtered.map(entity => (
            <GCRCard
              key={entity.slug || entity.id}
              entity={entity}
              category={category}
              onSave={handleSave}
              savedSlugs={savedSlugs}
            />
          ))}
        </div>
      )}
    </div>
  )
}
