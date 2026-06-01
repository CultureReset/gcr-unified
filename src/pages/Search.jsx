import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import GCRHeader from '../components/GCRHeader'
import { API_BASE } from '../config'
import './Search.css'

export default function Search() {
  const navigate = useNavigate()
  const { userId } = useApp()
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchInput, setSearchInput] = useState(query)

  // Group results by business
  const groupedResults = {}
  results.forEach(item => {
    const businessSlug = item.business_slug || item.parent_slug || 'unknown'
    const businessName = item.business_name || item.parent_name || 'Unknown'
    if (!groupedResults[businessSlug]) {
      groupedResults[businessSlug] = {
        slug: businessSlug,
        name: businessName,
        image: item.business_image || item.parent_image,
        items: []
      }
    }
    groupedResults[businessSlug].items.push(item)
  })

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
        const res = await fetch(
          `${API_BASE}/api/gcr/search?q=${encodeURIComponent(query)}&limit=100`
        )
        if (res.ok) {
          const data = await res.json()
          setResults(data.results || [])
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

  const handleSaveItem = (item) => {
    if (!userId) {
      navigate('/auth')
    } else {
      console.log('Save item:', item.slug)
    }
  }

  return (
    <div className="search-page">
      <GCRHeader />

      {/* Hero Section */}
      <div className="search-hero">
        <div className="hero-content">
          <h1>Search Results</h1>

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
          <div className="loading">Searching...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : !query.trim() ? (
          <div className="empty-state">
            <p>Enter a search term to find restaurants, menu items, and more</p>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <p>No results found for "<strong>{query}</strong>"</p>
            <p>Try searching for restaurants, dishes, or keywords</p>
          </div>
        ) : (
          <div className="results-list">
            {Object.entries(groupedResults).map(([slug, business]) => (
              <div key={slug} className="business-section">
                {/* Business Header */}
                <div className="business-header">
                  {business.image && (
                    <img
                      src={business.image}
                      alt={business.name}
                      className="business-image"
                    />
                  )}
                  <div className="business-info">
                    <h2 className="business-name">{business.name}</h2>
                    <p className="business-item-count">
                      {business.items.length} item{business.items.length !== 1 ? 's' : ''} match
                    </p>
                  </div>
                  <button
                    className="view-business-btn"
                    onClick={() => navigate(`/business/${slug}`)}
                  >
                    View Profile →
                  </button>
                </div>

                {/* Menu Items Grid */}
                <div className="items-grid">
                  {business.items.map((item) => (
                    <div key={item.slug} className="menu-item">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="item-image"
                        />
                      )}
                      <div className="item-content">
                        <h4 className="item-name">{item.name}</h4>
                        {item.description && (
                          <p className="item-desc">{item.description}</p>
                        )}
                        {item.price && (
                          <p className="item-price">${item.price}</p>
                        )}
                        {item.section && (
                          <p className="item-section">{item.section}</p>
                        )}
                      </div>
                      <button
                        className="item-save-btn"
                        onClick={() => handleSaveItem(item)}
                        title="Save this item"
                      >
                        ❤️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
