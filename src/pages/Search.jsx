import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import Toast from '../components/Toast'
import { API_BASE } from '../config'
import './Search.css'

export default function Search() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState(query)
  const [toast, setToast] = useState(null)
  const debounceRef = useRef(null)

  // Run search whenever URL query param changes
  useEffect(() => {
    setSearchInput(query)
    if (!query.trim()) { setResults([]); setLoading(false); return }

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`${API_BASE}/api/gcr/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, limit: 100 })
        })
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json()
        setResults(data.results || [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [query])

  // Debounced live search — fires 400ms after user stops typing
  const handleInputChange = (e) => {
    const val = e.target.value
    setSearchInput(val)
    clearTimeout(debounceRef.current)
    if (val.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        setSearchParams({ q: val.trim() }, { replace: true })
      }, 400)
    } else if (!val.trim()) {
      setResults([])
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    clearTimeout(debounceRef.current)
    if (searchInput.trim()) setSearchParams({ q: searchInput.trim() }, { replace: true })
  }

  const handleShare = () => {
    const url = `${window.location.origin}/search?q=${encodeURIComponent(query)}`
    if (navigator.share) {
      navigator.share({ title: `Search: "${query}"`, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url)
      setToast({ message: 'Link copied!', type: 'success' })
    }
  }

  // Flatten all matched items across all results for the "Items" count
  const totalItems = results.reduce((n, r) => n + (r.matched_menu_items?.length || 0) + (r.matched_specials?.length || 0), 0)

  return (
    <div className="search-page">

      <div className="search-hero">
        <div className="search-hero-inner">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search restaurants, menu items, specials..."
              value={searchInput}
              onChange={handleInputChange}
              autoComplete="off"
              autoFocus
            />
            <button type="submit" className="search-submit">🔍</button>
          </form>
          {query.trim() && (
            <button className="search-share-btn" onClick={handleShare}>📤 Share</button>
          )}
        </div>
      </div>

      <div className="search-content">
        {loading ? (
          <div className="search-loading">
            {[...Array(3)].map((_, i) => <div key={i} className="search-skeleton-card" />)}
          </div>
        ) : error ? (
          <div className="search-empty">
            <div>⚠️</div>
            <div>Search failed — try again</div>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : !query.trim() ? (
          <div className="search-empty">
            <div style={{ fontSize: 40 }}>🔍</div>
            <div>Search for restaurants, menu items, specials &amp; more</div>
          </div>
        ) : results.length === 0 ? (
          <div className="search-empty">
            <div style={{ fontSize: 40 }}>😕</div>
            <div>No results for &ldquo;<strong>{query}</strong>&rdquo;</div>
            <div style={{ fontSize: 13, color: '#8fa3b1', marginTop: 6 }}>Try a different keyword</div>
          </div>
        ) : (
          <>
            <div className="search-results-header">
              {results.length} restaurant{results.length !== 1 ? 's' : ''}
              {totalItems > 0 && ` · ${totalItems} menu item${totalItems !== 1 ? 's' : ''}`}
              {' '}matching &ldquo;{query}&rdquo;
            </div>

            {results.map(biz => (
              <SearchResultCard key={biz.slug} biz={biz} navigate={navigate} />
            ))}
          </>
        )}
      </div>

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}

const ITEMS_PREVIEW = 3

function SearchResultCard({ biz, navigate }) {
  const [showAll, setShowAll] = useState(false)
  const items = biz.matched_menu_items || []
  const specials = biz.matched_specials || []
  const events = biz.matched_events || []
  const allMatches = [
    ...items.map(i => ({ ...i, _type: 'menu' })),
    ...specials.map(s => ({ ...s, _type: 'special' })),
    ...events.map(e => ({ ...e, _type: 'event' })),
  ]
  const hasMatches = allMatches.length > 0
  const visible = showAll ? allMatches : allMatches.slice(0, ITEMS_PREVIEW)

  const photo = biz.photos?.[0]?.url || biz.hero_image_url

  return (
    <div className="sr-card">
      <div className="sr-biz-row" onClick={() => navigate(`/business/${biz.slug}`)}>
        {photo && <div className="sr-biz-photo" style={{ backgroundImage: `url(${photo})` }} />}
        <div className="sr-biz-info">
          <div className="sr-biz-name">{biz.name}</div>
          <div className="sr-biz-meta">
            {biz.rating && <span>⭐ {Number(biz.rating).toFixed(1)}</span>}
            {biz.city && <span>📍 {biz.city}</span>}
            {biz.price_range && <span>{biz.price_range}</span>}
          </div>
          {hasMatches && (
            <div className="sr-match-count">
              {items.length > 0 && `🍽️ ${items.length} match${items.length !== 1 ? 'es' : ''}`}
              {specials.length > 0 && ` · ✨ ${specials.length} special${specials.length !== 1 ? 's' : ''}`}
              {events.length > 0 && ` · 🎉 ${events.length} event${events.length !== 1 ? 's' : ''}`}
            </div>
          )}
        </div>
        <button className="sr-view-btn">View →</button>
      </div>

      {hasMatches && (
        <div className="sr-matches">
          <div className="sr-items-list">
            {visible.map((item, i) => {
              if (item._type === 'menu') return (
                <div key={i} className="sr-item" onClick={() => navigate(`/business/${biz.slug}`)}>
                  <div className="sr-item-left">
                    <div className="sr-item-name">{item.item_name}</div>
                    {item.description && <div className="sr-item-desc">{item.description}</div>}
                  </div>
                  {item.price != null && (
                    <div className="sr-item-price">${Number(item.price).toFixed(2).replace(/\.00$/, '')}</div>
                  )}
                </div>
              )
              if (item._type === 'special') return (
                <div key={i} className="sr-item sr-item--special" onClick={() => navigate(`/business/${biz.slug}`)}>
                  <div className="sr-item-left">
                    <div className="sr-item-name">✨ {item.special_name || item.name}</div>
                    {(item.description || item.discount_text) && (
                      <div className="sr-item-desc">{item.description || item.discount_text}</div>
                    )}
                  </div>
                </div>
              )
              return (
                <div key={i} className="sr-item sr-item--event" onClick={() => navigate(`/business/${biz.slug}`)}>
                  <div className="sr-item-left">
                    <div className="sr-item-name">🎉 {item.event_name || item.name}</div>
                    {item.artist_name && <div className="sr-item-desc">🎤 {item.artist_name}</div>}
                  </div>
                  {item.event_date && <div className="sr-item-price" style={{ fontSize: 11 }}>{item.event_date}</div>}
                </div>
              )
            })}
          </div>
          {allMatches.length > ITEMS_PREVIEW && (
            <button className="sr-toggle" onClick={() => setShowAll(s => !s)}>
              {showAll ? '▲ Show less' : `▼ +${allMatches.length - ITEMS_PREVIEW} more`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
