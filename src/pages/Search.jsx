import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import GCRHeader from '../components/GCRHeader'
import GCRCard from '../components/GCRCard'
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
  const [savedSlugs, setSavedSlugs] = useState(new Set())

  useEffect(() => {
    setSearchInput(query)
    if (!query.trim()) { setResults([]); setLoading(false); return }

    async function loadResults() {
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
    loadResults()
  }, [query])

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchInput.trim()) navigate(`/search?q=${encodeURIComponent(searchInput.trim())}`)
  }

  const handleSave = (entity) => {
    const slug = entity.slug || entity.id
    setSavedSlugs(prev => {
      const next = new Set(prev)
      next.has(slug) ? next.delete(slug) : next.add(slug)
      return next
    })
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

  return (
    <div className="search-page">
      <GCRHeader />

      <div className="search-hero">
        <div className="search-hero-inner">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="text"
              placeholder="Search restaurants, things to do, events..."
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
            <div>Search for restaurants, activities, events &amp; more</div>
          </div>
        ) : results.length === 0 ? (
          <div className="search-empty">
            <div style={{ fontSize: 40 }}>😕</div>
            <div>No results for "<strong>{query}</strong>"</div>
            <div style={{ fontSize: 13, color: '#8fa3b1', marginTop: 6 }}>Try a different keyword</div>
          </div>
        ) : (
          <>
            <div className="search-results-header">
              {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            </div>
            <div className="search-results-list">
              {results.map(entity => (
                <GCRCard
                  key={entity.slug || entity.id}
                  entity={entity}
                  category="search"
                  onSave={handleSave}
                  savedSlugs={savedSlugs}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  )
}
