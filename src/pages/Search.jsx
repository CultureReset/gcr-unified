import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import GCRHeader from '../components/GCRHeader'
import Toast from '../components/Toast'
import { SkeletonBusinessSection } from '../components/SkeletonLoader'
import { saveItem, unsaveItem } from '../services/gcrApi'
import { API_BASE } from '../config'
import './Search.css'

export default function Search() {
  const navigate = useNavigate()
  const { userId } = useApp()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [results, setResults] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState(query)
  const [toast, setToast] = useState(null)
  const [savedSlugs, setSavedSlugs] = useState(new Set())
  const [viewMode, setViewMode] = useState('items')  // 'items' or 'restaurants'

  // Load search results
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    async function loadResults() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(
          `${API_BASE}/api/gcr/search`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, limit: 100 })
          }
        )
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
          setItems(data.items || [])
          setViewMode(data.items && data.items.length > 0 ? 'items' : 'restaurants')
        } else {
          setError('Search failed. Please try again.')
        }
      } catch (err) {
        console.error('Error searching:', err)
        setError('Failed to search. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [query])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchInput.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchInput)}`)
    }
  }

  const handleSaveItem = async (item) => {
    if (!userId) {
      navigate('/auth')
      return
    }

    try {
      const isSaved = savedSlugs.has(item.slug || item.entity_slug)

      if (isSaved) {
        await unsaveItem(item.slug || item.entity_slug)
        setSavedSlugs(prev => {
          const next = new Set(prev)
          next.delete(item.slug || item.entity_slug)
          return next
        })
        setToast({ message: 'Removed from saved', type: 'info' })
      } else {
        await saveItem(item.slug || item.entity_slug)
        setSavedSlugs(prev => new Set(prev).add(item.slug || item.entity_slug))
        setToast({ message: 'Saved!', type: 'success' })
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to save', type: 'error' })
    }
  }

  const handleShareSearch = () => {
    if (!query.trim()) return

    const searchUrl = `${window.location.origin}/search?q=${encodeURIComponent(query)}`

    if (navigator.share) {
      navigator.share({
        title: `Search results for "${query}" - Gulf Coast Radar`,
        text: `Check out these places I found on Gulf Coast Radar`,
        url: searchUrl
      }).catch(() => {})
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(searchUrl)
      setToast({ message: 'Link copied to clipboard!', type: 'success' })
    }
  }

  return (
    <div className="search-page">
      <GCRHeader />

      {/* Hero Section */}
      <div className="search-hero">
        <div className="hero-content">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
            <h1 style={{margin:0}}>Search</h1>
            {query.trim() && (
              <button
                onClick={handleShareSearch}
                style={{background:'rgba(255,255,255,0.3)',border:'none',color:'white',padding:'6px 12px',borderRadius:'6px',cursor:'pointer',fontSize:'13px',fontWeight:600}}
                title="Share this search"
              >
                📤 Share
              </button>
            )}
          </div>

          {/* Search Bar */}
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search restaurants, items, specials..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              autoComplete="off"
              autoFocus
            />
            <button type="submit" className="search-submit">🔍</button>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="search-content">
        {loading ? (
          <div className="search-skeleton">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonBusinessSection key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="error">
            <div style={{fontSize:'28px',marginBottom:'12px'}}>⚠️</div>
            <div style={{fontWeight:600,marginBottom:'8px'}}>Search Failed</div>
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{marginTop:'12px',padding:'8px 16px',background:'var(--accent)',color:'white',border:'none',borderRadius:'8px',cursor:'pointer'}}
            >
              Try Again
            </button>
          </div>
        ) : !query.trim() ? (
          <div className="empty-state">
            <p>Enter a search term to find restaurants, menu items, and more</p>
          </div>
        ) : results.length === 0 && items.length === 0 ? (
          <div className="empty-state">
            <p>No results found for "<strong>{query}</strong>"</p>
            <p>Try searching for restaurants, dishes, or keywords</p>
          </div>
        ) : (
          <>
            {/* View Mode Tabs */}
            <div style={{display:'flex',gap:'8px',padding:'16px 16px 0 16px',borderBottom:'1px solid var(--border)',marginBottom:'16px',justifyContent:'center'}}>
              <button
                onClick={() => setViewMode('items')}
                style={{
                  padding:'8px 16px',
                  background: viewMode === 'items' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'items' ? 'white' : 'var(--text)',
                  border: 'none',
                  borderRadius:'6px',
                  cursor:'pointer',
                  fontWeight:600,
                  fontSize:'14px'
                }}
              >
                🍽️ Items ({items.length})
              </button>
              <button
                onClick={() => setViewMode('restaurants')}
                style={{
                  padding:'8px 16px',
                  background: viewMode === 'restaurants' ? 'var(--accent)' : 'transparent',
                  color: viewMode === 'restaurants' ? 'white' : 'var(--text)',
                  border: 'none',
                  borderRadius:'6px',
                  cursor:'pointer',
                  fontWeight:600,
                  fontSize:'14px'
                }}
              >
                🏪 Restaurants ({results.length})
              </button>
            </div>

            {/* Items View */}
            {viewMode === 'items' && items.length > 0 && (
              <div className="results-list" style={{paddingTop:'0'}}>
                {items.map((item, idx) => (
                  <div key={`item-${idx}`} className="menu-item-result" style={{
                    padding:'12px 16px',
                    borderBottom:'1px solid var(--border)',
                    display:'flex',
                    justifyContent:'space-between',
                    alignItems:'start'
                  }}>
                    <div style={{flex:1}}>
                      <h3 style={{margin:'0 0 4px 0',fontSize:'16px',fontWeight:600}}>{item.item_name}</h3>
                      {item.description && (
                        <p style={{margin:'0 0 6px 0',fontSize:'13px',color:'var(--text-muted)'}}>{item.description}</p>
                      )}
                      <div style={{display:'flex',gap:'16px',fontSize:'12px',color:'var(--text-muted)'}}>
                        <span>📍 {item.restaurant_name}</span>
                        {item.restaurant_rating && <span>⭐ {item.restaurant_rating}</span>}
                        {item.price && <span className="item-price" style={{fontWeight:600,color:'var(--text)'}}>${item.price}</span>}
                        {item.type === 'special' && <span style={{color:'var(--accent)'}}>✨ Special</span>}
                        {item.type === 'event' && <span style={{color:'var(--accent)'}}>🎉 Event</span>}
                      </div>
                    </div>
                    <button
                      style={{
                        background:'transparent',
                        border:'none',
                        fontSize:'20px',
                        cursor:'pointer',
                        padding:'0 8px'
                      }}
                      onClick={() => navigate(`/business/${item.restaurant_slug}`)}
                      title="View restaurant"
                    >
                      →
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Restaurants View */}
            {viewMode === 'restaurants' && (
              <div className="results-list" style={{paddingTop:'0'}}>
            {results.map((business) => (
              <div key={business.slug} className="business-section">
                {/* Business Header */}
                <div className="business-header">
                  {business.hero_image_url && (
                    <img
                      src={business.hero_image_url}
                      alt={business.name}
                      className="business-image"
                    />
                  )}
                  <div className="business-info">
                    <h2 className="business-name">{business.name}</h2>
                    <p className="business-item-count">
                      {business.matched_menu_items?.length || 0} items match
                    </p>
                    {business.rating && (
                      <p className="business-rating">⭐ {business.rating}</p>
                    )}
                  </div>
                  <button
                    className="view-business-btn"
                    onClick={() => navigate(`/business/${business.slug}`)}
                  >
                    View Profile →
                  </button>
                </div>

                {/* Menu Items Grid */}
                {business.matched_menu_items && business.matched_menu_items.length > 0 && (
                  <div className="items-grid">
                    {business.matched_menu_items.map((item, idx) => (
                      <div key={`${business.slug}-item-${idx}`} className="menu-item">
                        <div className="item-content">
                          <h4 className="item-name">{item.item_name}</h4>
                          {item.description && (
                            <p className="item-desc">{item.description}</p>
                          )}
                          {item.price && (
                            <p className="item-price">${item.price}</p>
                          )}
                        </div>
                        <button
                          className={`item-save-btn ${savedSlugs.has(item.slug || item.entity_slug) ? 'saved' : ''}`}
                          onClick={() => handleSaveItem(item)}
                          title={savedSlugs.has(item.slug || item.entity_slug) ? 'Remove from saved' : 'Save this item'}
                        >
                          {savedSlugs.has(item.slug || item.entity_slug) ? '❤️' : '🤍'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Specials Section */}
                {business.matched_specials && business.matched_specials.length > 0 && (
                  <div className="specials-section">
                    <h3>✨ Specials</h3>
                    <div className="specials-list">
                      {business.matched_specials.map((special, idx) => (
                        <div key={`${business.slug}-special-${idx}`} className="special-item">
                          <h4>{special.special_name}</h4>
                          <p>{special.description || special.discount_text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Events Section */}
                {business.matched_events && business.matched_events.length > 0 && (
                  <div className="events-section">
                    <h3>🎉 Events</h3>
                    <div className="events-list">
                      {business.matched_events.map((event, idx) => (
                        <div key={`${business.slug}-event-${idx}`} className="event-item">
                          <h4>{event.event_name}</h4>
                          {event.artist_name && <p>Artist: {event.artist_name}</p>}
                          {event.event_date && <p>Date: {event.event_date}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
              </div>
            )}
          </>
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
