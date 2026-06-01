import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GCRHeader from '../components/GCRHeader'
import GCRCard from '../components/GCRCard'
import { API_BASE } from '../config'
import './CategoryPage.css'

const CATEGORY_CONFIG = {
  restaurants: { label: 'Restaurants', emoji: '🍽️', type: 'restaurant' },
  coffee: { label: 'Coffee & Sweets', emoji: '☕', type: 'coffee' },
  'happy-hours': { label: 'Happy Hours', emoji: '🍻', type: 'bar' },
  events: { label: 'Events', emoji: '🎉', type: 'event' },
  'things-to-do': { label: 'Things To Do', emoji: '🎯', type: 'activity' },
  services: { label: 'Services', emoji: '🛠️', type: 'service' },
  'public-spots': { label: 'Public Spots', emoji: '✨', type: 'park' },
  feed: { label: 'Live Feed', emoji: '📡', type: 'feed' },
  shopping: { label: 'Shopping', emoji: '🛍️', type: 'shop' },
  staying: { label: 'Staying', emoji: '🏨', type: 'hotel' },
}

const HERO_IMAGES = {
  restaurants: 'https://images.unsplash.com/photo-1504674900967-77800e8e33fe?w=1200&q=80',
  coffee: 'https://images.unsplash.com/photo-1511537190424-bbbab87ac5d0?w=1200&q=80',
  'happy-hours': 'https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=1200&q=80',
  events: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80',
  'things-to-do': 'https://images.unsplash.com/photo-1544716278-ca5e3af4abd8?w=1200&q=80',
  services: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80',
  'public-spots': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
  feed: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80',
  shopping: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=1200&q=80',
  staying: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
}

export default function CategoryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const category = location.pathname.slice(1) // Remove leading slash
  const [entities, setEntities] = useState([])
  const [allTags, setAllTags] = useState([])
  const [selectedTag, setSelectedTag] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const config = CATEGORY_CONFIG[category]
  const heroImage = HERO_IMAGES[category]

  const PAGE_SIZE = 10

  useEffect(() => {
    if (!config) {
      setError('Category not found')
      setLoading(false)
      return
    }

    async function loadEntities() {
      try {
        setLoading(true)
        const res = await fetch(
          `${API_BASE}/api/gcr/entities?limit=100&offset=0`
        )
        if (!res.ok) throw new Error('Failed to load entities')
        const data = await res.json()
        const ents = data.entities || []
        setEntities(ents)
        setHasMore(ents.length >= PAGE_SIZE)

        // Extract unique tags from all entities
        const tagsSet = new Set()
        ents.forEach(e => {
          if (e.tags) {
            (Array.isArray(e.tags) ? e.tags : []).forEach(t => {
              if (typeof t === 'string') tagsSet.add(t)
              else if (t.tag_name) tagsSet.add(t.tag_name)
            })
          }
        })
        setAllTags(['All', ...Array.from(tagsSet).sort()])
      } catch (err) {
        console.error('Error loading entities:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadEntities()
  }, [category])

  const filtered = !selectedTag || selectedTag === 'All'
    ? entities
    : entities.filter(e => {
        const tags = Array.isArray(e.tags) ? e.tags : []
        return tags.some(t => {
          const tag = typeof t === 'string' ? t : t.tag_name
          return tag === selectedTag
        })
      })

  const handleLoadMore = async () => {
    try {
      const newOffset = offset + PAGE_SIZE
      const res = await fetch(
        `${API_BASE}/api/gcr/entities?limit=100&offset=${newOffset}`
      )
      if (!res.ok) throw new Error('Failed to load more')
      const data = await res.json()
      const newEnts = data.entities || []
      setEntities([...entities, ...newEnts])
      setOffset(newOffset)
      setHasMore(newEnts.length >= PAGE_SIZE)
    } catch (err) {
      console.error('Error loading more:', err)
    }
  }

  if (error && !config) {
    return (
      <div className="category-error">
        <h2>Category not found</h2>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    )
  }

  return (
    <div className="category-page">
      <GCRHeader />

      {/* Hero Section */}
      <div
        className="category-hero"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${heroImage})`,
        }}
      >
        <div className="hero-content">
          <h1 className="hero-title">{config?.label || 'Browse'}</h1>
          <p className="hero-sub">Discover what's waiting for you</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="category-toolbar">
        <h2 className="results-title">{filtered.length} results</h2>
        <div className="filter-chips">
          {allTags.map(tag => (
            <button
              key={tag}
              className={`chip ${selectedTag === tag ? 'active' : ''}`}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="category-content">
        {/* Listings Grid */}
        <div className="listings-grid">
          {loading && !entities.length ? (
            <div className="loading">Loading...</div>
          ) : error ? (
            <div className="error">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="empty">No results found</div>
          ) : (
            filtered.map(entity => (
              <GCRCard
                key={entity.id || entity.slug}
                entity={entity}
                onSave={(e) => console.log('Save:', e.slug)}
              />
            ))
          )}
        </div>

        {/* Sidebar */}
        <aside className="category-sidebar">
          <div className="sidebar-panel">
            <h3>Popular Nearby</h3>
            <p className="sidebar-text">Enable location to see nearby places</p>
          </div>

          <div className="sidebar-panel">
            <h3>📍 Map</h3>
            <p className="sidebar-text">Map view coming soon</p>
          </div>

          <div className="sidebar-panel">
            <h3>Claim Your Listing</h3>
            <p className="sidebar-text">
              Is this your business? Claim and manage your profile
            </p>
            <button className="claim-btn">Get Started →</button>
          </div>
        </aside>
      </div>

      {/* Load More */}
      {hasMore && !loading && (
        <div className="load-more-container">
          <button className="load-more-btn" onClick={handleLoadMore}>
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
