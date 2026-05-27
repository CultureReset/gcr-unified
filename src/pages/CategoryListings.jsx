import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import EntityCard from '../components/EntityCard'
import { API_BASE } from '../config'
import './CategoryListings.css'

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
