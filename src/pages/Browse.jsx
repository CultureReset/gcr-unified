import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../config'
import './Browse.css'

export default function Browse() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch(`${API_BASE}/api/gcr/sections`)
        if (!res.ok) throw new Error('Failed to load categories')
        const data = await res.json()
        setCategories(data.sections || [])
      } catch (err) {
        console.error('Error loading categories:', err)
        setCategories([
          { name: 'Restaurants', slug: 'restaurants' },
          { name: 'Coffee & Desserts', slug: 'coffee' },
          { name: 'Events', slug: 'events' },
          { name: 'Activities', slug: 'activities' },
          { name: 'Hotels & Rentals', slug: 'staying' },
          { name: 'Shopping', slug: 'shopping' },
          { name: 'Artists', slug: 'artists' },
        ])
      } finally {
        setLoading(false)
      }
    }
    loadCategories()
  }, [])

  return (
    <div className="browse-container">
      <header className="browse-header">
        <h1>Gulf Coast Radar</h1>
        <p>Discover Orange Beach & Gulf Shores</p>
        <button className="mode-switch" onClick={() => navigate('/swipe/restaurants')}>
          Try Swipe Mode →
        </button>
      </header>

      {loading ? (
        <div className="loading">Loading categories...</div>
      ) : (
        <div className="category-grid">
          {categories.map(cat => (
            <div
              key={cat.slug}
              className="category-card"
              onClick={() => navigate(`/category/${cat.slug}`)}
            >
              <h3>{cat.name}</h3>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
