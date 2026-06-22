import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import GCRCard from '../components/GCRCard'
import { API_BASE } from '../config'
import { subtypeToCategory, formatSubtypeLabel } from '../categoryMap'
import './CategoryPage.css'

const CATEGORY_CONFIG = {
  restaurants:    { label: 'Restaurants',     emoji: '🍽️' },
  coffee:         { label: 'Coffee & Sweets', emoji: '☕' },
  'happy-hours':  { label: 'Happy Hours',     emoji: '🍻' },
  'things-to-do': { label: 'Things To Do',    emoji: '🎯' },
  services:       { label: 'Services',         emoji: '🛠️' },
  'public-spots': { label: 'Public Spots',     emoji: '✨' },
  shopping:       { label: 'Shopping',          emoji: '🛍️' },
  staying:        { label: 'Staying',           emoji: '🏨' },
  feed:           { label: 'Live Feed',         emoji: '📡' },
  nightlife:      { label: 'Bars & Nightlife',  emoji: '🍸' },
  wellness:       { label: 'Health & Wellness', emoji: '💆' },
}


const HERO_IMAGES = {
  restaurants: 'https://images.unsplash.com/photo-1504674900967-77800e8e33fe?w=1200&q=80',
  coffee: 'https://images.unsplash.com/photo-1511537190424-bbbab87ac5d0?w=1200&q=80',
  'happy-hours': 'https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=1200&q=80',
  events: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80',
  'things-to-do': 'https://images.unsplash.com/photo-1544716278-ca5e3af4abd8?w=1200&q=80',
  services: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&q=80',
  'public-spots': 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
  feed:         'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&q=80',
  nightlife:    'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1200&q=80',
  wellness:     'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1200&q=80',
  shopping: 'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=1200&q=80',
  staying: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80',
}

export default function CategoryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { savedPlaces } = useApp()
  const category = location.pathname.slice(1) // Remove leading slash
  const [entities, setEntities] = useState([])
  const [allTags, setAllTags] = useState([])
  const [selectedTag, setSelectedTag] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [savedSlugs, setSavedSlugs] = useState(new Set())

  useEffect(() => {
    setSavedSlugs(new Set((savedPlaces || []).map(p => p.slug)))
  }, [savedPlaces])

  const handleSave = (entity) => {
    const slug = entity.slug || entity.id
    setSavedSlugs(prev => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
  }

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
        setError(null)

        let ents = []

        if (category === 'happy-hours') {
          const res = await fetch(`${API_BASE}/api/gcr/happy-hours`)
          if (!res.ok) throw new Error('Failed to load happy hours')
          const data = await res.json()
          ents = data.happyHours || data.businesses || []
        } else {
          // Fetch all entities in batches of 1000 to bypass API hard limit
          let all = []
          let offset = 0
          const BATCH = 1000
          while (true) {
            const res = await fetch(`${API_BASE}/api/gcr/entities?limit=${BATCH}&offset=${offset}`)
            if (!res.ok) break
            const data = await res.json()
            const batch = data.entities || []
            all = all.concat(batch)
            if (batch.length < BATCH) break
            offset += BATCH
          }
          // feed = show everything; otherwise filter by subtype
          ents = category === 'feed'
            ? all
            : all.filter(e => subtypeToCategory(e) === category)
        }

        // Deduplicate: same name → keep the one with a proper subtype / no hash slug
        const seen = new Map()
        const hasHashSlug = s => /[-_][A-Za-z0-9]{6,}$/.test(s || '') || /[-]\d+$/.test(s || '')
        for (const e of ents) {
          const key = (e.name || '').trim().toLowerCase()
          if (!seen.has(key)) { seen.set(key, e); continue }
          const prev = seen.get(key)
          const prevHash = hasHashSlug(prev.slug)
          const curHash = hasHashSlug(e.slug)
          if (prevHash && !curHash) seen.set(key, e)
          else if (!prevHash && curHash) { /* keep prev */ }
          else if (e.entity_subtype && !prev.entity_subtype) seen.set(key, e)
        }
        ents = Array.from(seen.values())

        setEntities(ents)
        setHasMore(false)

        // Extract unique curated tags for filter chips (skip raw Google Place types)
        const SKIP_CATEGORIES = new Set(['google_type', 'google_primary_type', 'google_secondary_type'])
        const tagsSet = new Set()
        ents.forEach(e => {
          // Use curated entity_subtype as a chip if present
          if (e.entity_subtype) tagsSet.add(formatSubtypeLabel(e.entity_subtype))
          ;(Array.isArray(e.tags) ? e.tags : []).forEach(t => {
            const cat = typeof t === 'object' ? (t.tag_category || '') : ''
            if (SKIP_CATEGORIES.has(cat)) return
            const tag = typeof t === 'string' ? t : (t.tag_name || t.tag || '')
            if (tag) tagsSet.add(tag)
          })
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

  const SKIP_CATS = new Set(['google_type', 'google_primary_type', 'google_secondary_type'])
  const filtered = !selectedTag || selectedTag === 'All'
    ? entities
    : entities.filter(e => {
        if (formatSubtypeLabel(e.entity_subtype) === selectedTag) return true
        const tags = Array.isArray(e.tags) ? e.tags : []
        return tags.some(t => {
          const cat = typeof t === 'object' ? (t.tag_category || '') : ''
          if (SKIP_CATS.has(cat)) return false
          const tag = typeof t === 'string' ? t : (t.tag_name || t.tag || '')
          return tag === selectedTag
        })
      })

  const handleLoadMore = () => {
    // All entities loaded upfront — no pagination needed
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

      {/* Listings */}
      <div className="listings-stack">
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
              category={category}
              onSave={handleSave}
              savedSlugs={savedSlugs}
            />
          ))
        )}
      </div>
    </div>
  )
}
