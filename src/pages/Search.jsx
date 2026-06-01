import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import GCRHeader from '../components/GCRHeader'
import Toast from '../components/Toast'
import { API_BASE } from '../config'
import './Search.css'

export default function Search() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState(query)
  const [toast, setToast] = useState(null)

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

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchInput.trim()) navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`)
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
      <GCRHeader />

      <div className="search-hero">
        <div className="search-hero-inner">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search restaurants, menu items, specials..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              autoComplete="off"
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

function SearchResultCard({ biz, navigate }) {
  const [expanded, setExpanded] = useState(true)
  const items = biz.matched_menu_items || []
  const specials = biz.matched_specials || []
  const events = biz.matched_events || []
  const hasMatches = items.length > 0 || specials.length > 0 || events.length > 0

  const photo = biz.photos?.[0]?.url || biz.hero_image_url ||
    'https://images.unsplash.com/photo-1504674900967-77800e8e33fe?w=600&q=80'

  return (
    <div className="sr-card">
      {/* Business Row */}
      <div className="sr-biz-row" onClick={() => navigate(`/business/${biz.slug}`)}>
        <div className="sr-biz-photo" style={{ backgroundImage: `url(${photo})` }} />
        <div className="sr-biz-info">
          <div className="sr-biz-name">{biz.icon || '📍'} {biz.name}</div>
          <div className="sr-biz-meta">
            {biz.rating && <span>⭐ {Number(biz.rating).toFixed(1)}</span>}
            {biz.city && <span>📍 {biz.city}</span>}
            {biz.price_range && <span>{biz.price_range}</span>}
          </div>
          {hasMatches && (
            <div className="sr-match-count">
              {items.length > 0 && `🍽️ ${items.length} menu item${items.length !== 1 ? 's' : ''}`}
              {specials.length > 0 && ` · ✨ ${specials.length} special${specials.length !== 1 ? 's' : ''}`}
              {events.length > 0 && ` · 🎉 ${events.length} event${events.length !== 1 ? 's' : ''}`}
            </div>
          )}
        </div>
        <button className="sr-view-btn">View →</button>
      </div>

      {/* Matched Items */}
      {hasMatches && (
        <div className="sr-matches">
          <button className="sr-toggle" onClick={() => setExpanded(e => !e)}>
            {expanded ? '▲ Hide matches' : '▼ Show matches'}
          </button>
          {expanded && (
            <div className="sr-items-list">
              {items.map((item, i) => (
                <div key={i} className="sr-item" onClick={() => navigate(`/business/${biz.slug}`)}>
                  <div className="sr-item-left">
                    <div className="sr-item-name">🍽️ {item.item_name}</div>
                    {item.description && <div className="sr-item-desc">{item.description}</div>}
                  </div>
                  {item.price != null && (
                    <div className="sr-item-price">${Number(item.price).toFixed(2).replace(/\.00$/, '')}</div>
                  )}
                </div>
              ))}
              {specials.map((s, i) => (
                <div key={`sp-${i}`} className="sr-item special" onClick={() => navigate(`/business/${biz.slug}`)}>
                  <div className="sr-item-left">
                    <div className="sr-item-name">✨ {s.special_name || s.name}</div>
                    {(s.description || s.discount_text) && (
                      <div className="sr-item-desc">{s.description || s.discount_text}</div>
                    )}
                  </div>
                </div>
              ))}
              {events.map((ev, i) => (
                <div key={`ev-${i}`} className="sr-item event" onClick={() => navigate(`/business/${biz.slug}`)}>
                  <div className="sr-item-left">
                    <div className="sr-item-name">🎉 {ev.event_name || ev.name}</div>
                    {ev.artist_name && <div className="sr-item-desc">🎤 {ev.artist_name}</div>}
                  </div>
                  {ev.event_date && <div className="sr-item-price" style={{ fontSize: 11 }}>{ev.event_date}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
