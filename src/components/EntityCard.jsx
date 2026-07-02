import { useNavigate } from 'react-router-dom'
import '../styles/EntityCard.css'

export default function EntityCard({ entity, category }) {
  const navigate = useNavigate()
  const imageUrl = entity.photos?.[0]?.image_url || entity.hero_image_url || `https://images.unsplash.com/photo-1504674900968-08049c043914?w=400&h=300&fit=crop`

  const handleClick = () => navigate(`/business/${entity.slug}`)

  return (
    <div className="entity-card" onClick={handleClick}>
      {/* Image */}
      <div className="card-image" style={{ backgroundImage: `url(${imageUrl})` }}>
        {!entity.is_active && <div className="card-badge closed">Closed</div>}
        {category === 'artists' && entity.is_performing_today && (
          <div className="card-badge live">🔴 Live Now</div>
        )}
        {category === 'events' && entity.is_today && (
          <div className="card-badge today">Today</div>
        )}
      </div>

      {/* Content */}
      <div className="card-content">
        <h3>{entity.name}</h3>

        {entity.subtitle && <p className="subtitle">{entity.subtitle}</p>}

        {entity.city && (
          <p className="meta-text">📍 {entity.city}, {entity.state}</p>
        )}

        {entity.rating && (
          <p className="rating">
            ⭐ {entity.rating.toFixed(1)} ({entity.review_count || 0})
          </p>
        )}

        {/* Restaurants, Coffee, Services, Public Spots, Shopping, Happy Hours */}
        {['restaurants', 'coffee', 'services', 'public-spots', 'shopping', 'happy-hours'].includes(category) && (
          <>
            {entity.description && (
              <p className="description">{entity.description.slice(0, 100)}...</p>
            )}
            {entity.hh_days && (
              <p className="hh-badge">🍺 {entity.hh_days}</p>
            )}
          </>
        )}

        {/* Activities */}
        {category === 'activities' && (
          <>
            {entity.price_range && <p className="price-badge">💰 From {entity.price_range}</p>}
            {entity.duration && <p className="meta-text">⏱ {entity.duration}</p>}
            {entity.group_size && <p className="meta-text">👥 Up to {entity.group_size}</p>}
            {entity.booking_url && <p className="confirm-badge">✅ Instant Confirmation</p>}
          </>
        )}

        {/* Events */}
        {category === 'events' && (
          <>
            {entity.event_date && <p className="event-date">📅 {entity.event_date}</p>}
            {entity.start_time && <p className="event-time">🕐 {entity.start_time}</p>}
            {entity.venue_name && <p className="venue-name">{entity.venue_name}</p>}
          </>
        )}

        {/* Staying */}
        {category === 'staying' && (
          <>
            {entity.unit_count && (
              <p className="units-badge">{entity.unit_count} Unit Types</p>
            )}
          </>
        )}

        {/* Artists */}
        {category === 'artists' && (
          <>
            {entity.performance_time && <p className="performance-time">🎸 {entity.performance_time}</p>}
            {entity.venue_name && <p className="venue-name">@ {entity.venue_name}</p>}
          </>
        )}
      </div>
    </div>
  )
}
