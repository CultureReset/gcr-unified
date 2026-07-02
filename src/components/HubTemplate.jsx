import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import EntityCard from './EntityCard'
import GallerySection from './GallerySection'
import { fetchChildRentals } from '../services/gcrApi'
import './templates/HubTemplate.css'

const CATEGORY_LABELS = {
  food: '🍽️ Restaurants & Food',
  stay: '🏨 Stay',
  activities: '🎯 Things To Do',
  nightlife: '🍹 Nightlife',
  shopping: '🛍️ Shopping',
}

export default function HubTemplate({ business, slug }) {
  const navigate = useNavigate()
  const [children, setChildren] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchChildRentals(slug).then(list => {
      if (!cancelled) { setChildren(list); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [slug])

  // Group children by category (already computed per-card by toCard/mapCategory)
  const grouped = useMemo(() => {
    const groups = {}
    for (const c of children) {
      const key = c.category || 'other'
      if (!groups[key]) groups[key] = []
      groups[key].push(c)
    }
    return groups
  }, [children])

  const categoryCount = Object.keys(grouped).length
  const cityState = [business.city, business.state].filter(Boolean).join(', ')

  return (
    <div className="hub-page">
      <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>

      {/* Hero */}
      <div
        className="hub-hero"
        style={{ backgroundImage: business.hero_image_url ? `url(${business.hero_image_url})` : undefined }}
      >
        <div className="hub-hero-overlay">
          <h1>{business.name}</h1>
          {business.subtitle && <p className="hub-tagline">{business.subtitle}</p>}
          <div className="hub-hero-meta">
            {business.rating && <span>⭐ {business.rating.toFixed(1)} ({business.review_count || 0})</span>}
            {cityState && <span>📍 {cityState}</span>}
          </div>
          <div className="hub-hero-actions">
            {business.phone && <a className="btn-primary" href={`tel:${business.phone}`}>📞 Call</a>}
            {business.google_maps_uri && <a className="btn-secondary" href={business.google_maps_uri} target="_blank" rel="noreferrer">🗺️ Directions</a>}
          </div>
        </div>
      </div>

      {/* Quick facts */}
      <div className="hub-stats">
        <div className="hub-stat"><strong>{children.length || business.child_count || 0}</strong><span>Businesses</span></div>
        <div className="hub-stat"><strong>{categoryCount}</strong><span>Categories</span></div>
        {business.price_range && <div className="hub-stat"><strong>{business.price_range}</strong><span>Price Range</span></div>}
      </div>

      {/* About */}
      {(business.description || business.editorial_summary || business.ai_overview) && (
        <section className="hub-section">
          <h2>About {business.name}</h2>
          <p>{business.description || business.editorial_summary || business.ai_overview}</p>
          {business.highlights?.length > 0 && (
            <ul className="hub-highlights">
              {business.highlights.map((h, i) => <li key={i}>✓ {h}</li>)}
            </ul>
          )}
        </section>
      )}

      {/* Categorized directory of children */}
      {loading ? (
        <section className="hub-section"><p className="hub-loading">Loading businesses…</p></section>
      ) : children.length === 0 ? (
        <section className="hub-section"><p className="hub-loading">No linked businesses yet.</p></section>
      ) : (
        Object.entries(grouped).map(([category, items]) => (
          <section className="hub-section" key={category}>
            <h2>{CATEGORY_LABELS[category] || category}</h2>
            <div className="hub-directory-grid">
              {items.map(entity => (
                <EntityCard key={entity.slug} entity={entity} category={category} />
              ))}
            </div>
          </section>
        ))
      )}

      {/* Events */}
      {business.events?.length > 0 && (
        <section className="hub-section">
          <h2>🎉 Happening Here</h2>
          <div className="hub-event-list">
            {business.events.map(ev => (
              <div className="hub-event-row" key={ev.id}>
                <strong>{ev.event_name}</strong>
                {ev.event_date && <span className="hub-event-date">{ev.event_date}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      <section className="hub-section">
        <h2>📸 Gallery</h2>
        <GallerySection slug={slug} />
      </section>

      {/* FAQ */}
      {business.faqs?.length > 0 && (
        <section className="hub-section">
          <h2>❓ FAQ</h2>
          <div className="hub-faq-list">
            {business.faqs.map(f => (
              <details className="hub-faq-item" key={f.id}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Contact footer */}
      <footer className="hub-footer">
        <h2>Visit {business.name}</h2>
        {business.address_line_1 && <p>{business.address_line_1}{cityState ? `, ${cityState}` : ''}</p>}
        <div className="hub-footer-actions">
          {business.phone && <a className="btn-primary" href={`tel:${business.phone}`}>📞 {business.phone}</a>}
          {business.google_maps_uri && <a className="btn-secondary" href={business.google_maps_uri} target="_blank" rel="noreferrer">Get Directions</a>}
        </div>
      </footer>
    </div>
  )
}
