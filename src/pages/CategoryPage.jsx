import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import GCRHeader from '../components/GCRHeader'
import GCRCard from '../components/GCRCard'
import { API_BASE } from '../config'
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
}

// Maps entity_subtype → category page (mirrors launching-gcr subtype mapping)
const SUBTYPE_TO_CATEGORY = {
  restaurant:'restaurants', restaurants:'restaurants',
  american_restaurant:'restaurants', seafood_restaurant:'restaurants', seafood:'restaurants',
  pizza_restaurant:'restaurants', bar:'restaurants', bar_grill:'restaurants',
  bar_and_grill:'restaurants', beach_bar:'restaurants', irish_pub:'restaurants', pub:'restaurants',
  hybrid_venue:'restaurants', casual_dining:'restaurants', southern:'restaurants',
  brunch_restaurant:'restaurants', breakfast_restaurant:'restaurants', steakhouse:'restaurants',
  hamburger_restaurant:'restaurants', sandwich_shop:'restaurants', diner:'restaurants',
  coffee_shop:'coffee', cafe:'coffee', bakery:'coffee', ice_cream:'coffee',
  ice_cream_shop:'coffee', donut_shop:'coffee', dessert_shop:'coffee', smoothie:'coffee',
  boutique:'shopping', souvenir:'shopping', retail:'shopping', shopping:'shopping',
  surf_shop:'shopping', gift_shop:'shopping', clothing:'shopping', clothing_store:'shopping',
  art_gallery:'shopping', grocery_store:'shopping', liquor_store:'shopping',
  parasailing:'things-to-do', dolphin_cruise:'things-to-do', boat_rental:'things-to-do',
  fishing_charter:'things-to-do', tour:'things-to-do', attraction:'things-to-do',
  jet_ski:'things-to-do', watersports:'things-to-do', snorkeling:'things-to-do',
  kayak_rental:'things-to-do', marina:'things-to-do', golf_course:'things-to-do',
  nightlife:'nightlife', night_club:'nightlife', sports_bar:'nightlife',
  rooftop_bar:'nightlife', lounge:'nightlife', cocktail_bar:'nightlife',
  services:'services', salon:'services', spa:'services', photographer:'services',
  wellness:'services', transportation:'services', concierge:'services',
  hotel:'staying', resort:'staying', condo:'staying', vacation_rental:'staying',
  motel:'staying', bed_and_breakfast:'staying', rv_park:'staying',
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
  const [savedSlugs, setSavedSlugs] = useState(new Set())

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
          const res = await fetch(`${API_BASE}/api/gcr/entities?limit=500`)
          if (!res.ok) throw new Error('Failed to load entities')
          const data = await res.json()
          const all = data.entities || []
          // feed = show everything; otherwise filter by subtype
          ents = category === 'feed'
            ? all
            : all.filter(e => {
                const raw = (e.entity_subtype || e.entity_type || e.type || '').toLowerCase().replace(/-/g, '_')
                return SUBTYPE_TO_CATEGORY[raw] === category
              })
        }

        setEntities(ents)
        setHasMore(false)

        // Extract unique tags for filter chips
        const tagsSet = new Set()
        ents.forEach(e => {
          ;(Array.isArray(e.tags) ? e.tags : []).forEach(t => {
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

  const filtered = !selectedTag || selectedTag === 'All'
    ? entities
    : entities.filter(e => {
        const tags = Array.isArray(e.tags) ? e.tags : []
        return tags.some(t => {
          const tag = typeof t === 'string' ? t : t.tag_name
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
