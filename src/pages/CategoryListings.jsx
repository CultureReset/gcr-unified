import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { API_BASE } from '../config'
import './CategoryListings.css'

function EntityCard({ entity, category }) {
  const navigate = useNavigate()
  const imageUrl = entity.photos?.[0]?.image_url || entity.hero_image_url || `https://images.unsplash.com/photo-1504674900968-08049c043914?w=400&h=300&fit=crop`

  return (
    <div className="entity-card" onClick={() => navigate(`/business/${entity.slug}`)}>
      <div className="card-image" style={{ backgroundImage: `url(${imageUrl})` }}>
        {entity.is_open === false && <div className="closed-badge">Closed</div>}
      </div>
      <div className="card-content">
        <h3>{entity.name}</h3>
        {entity.subtitle && <p className="subtitle">{entity.subtitle}</p>}
        {entity.description && <p className="description">{entity.description.slice(0, 100)}...</p>}
        {entity.rating && (
          <p className="rating">
            ⭐ {entity.rating.toFixed(1)} ({entity.review_count || 0} reviews)
          </p>
        )}
      </div>
    </div>
  )
}

export default function CategoryListings() {
  const { category } = useParams()
  const navigate = useNavigate()
  const [entities, setEntities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadEntities() {
      try {
        const res = await fetch(`${API_BASE}/api/gcr/entities?type=${category}`)
        if (!res.ok) throw new Error('Failed to load entities')
        const data = await res.json()
        setEntities(data.entities || [])
      } catch (err) {
        console.error('Error loading entities:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadEntities()
  }, [category])

  return (
    <div className="category-listings">
      <header className="listings-header">
        <button className="back-btn" onClick={() => navigate('/browse')}>← Back</button>
        <h1>{category.charAt(0).toUpperCase() + category.slice(1)}</h1>
      </header>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : (
        <div className="entities-grid">
          {entities.map(entity => (
            <EntityCard key={entity.slug} entity={entity} category={category} />
          ))}
        </div>
      )}
    </div>
  )
}
