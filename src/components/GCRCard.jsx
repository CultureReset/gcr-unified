import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './GCRCard.css'

const TAG_COLORS = {
  food: 'orange',
  drink: 'purple',
  seafood: 'teal',
  vibe: 'green',
  service: 'blue',
}

function getTagColor(tag) {
  const lower = (tag || '').toLowerCase()
  if (/seafood|fish|shrimp|oyster|crab/.test(lower)) return 'teal'
  if (/food|breakfast|lunch|dinner|cuisine/.test(lower)) return 'orange'
  if (/drink|beer|wine|cocktail|bar/.test(lower)) return 'purple'
  if (/music|waterfront|outdoor|patio|sunset/.test(lower)) return 'green'
  if (/dine|delivery|takeout|reserve/.test(lower)) return 'blue'
  return 'default'
}

function getStatusColor(entity) {
  if (!entity.hh_start || !entity.hh_end) return null
  const now = new Date()
  const hours = now.getHours()
  const minutes = now.getMinutes()
  const currentTime = hours * 60 + minutes

  const [hh_h, hh_m] = entity.hh_start.split(':').map(Number)
  const [hh_e_h, hh_e_m] = entity.hh_end.split(':').map(Number)
  const hhStart = hh_h * 60 + hh_m
  const hhEnd = hh_e_h * 60 + hh_e_m

  if (currentTime >= hhStart && currentTime < hhEnd) return 'green'
  if (currentTime < hhStart) return 'blue'
  return 'gray'
}

export default function GCRCard({ entity, onSave }) {
  const navigate = useNavigate()
  const [showHH, setShowHH] = useState(false)

  if (!entity) return null

  const status = getStatusColor(entity)
  const tags = entity.tags || []
  const displayTags = tags.slice(0, 4)

  return (
    <div className="gcr-card">
      {/* Image Area */}
      <div className="gcr-card-img" style={entity.hero_image_url ? { backgroundImage: `url(${entity.hero_image_url})` } : {}}>
        {/* Category Badge */}
        {entity.entity_subtype && (
          <div className="gcr-badge-category">{entity.entity_subtype}</div>
        )}

        {/* Status Badge */}
        {status && (
          <div className={`gcr-badge-status status-${status}`}>
            {status === 'green' ? '✓ Open' : status === 'blue' ? 'Coming' : '—'}
          </div>
        )}

        {/* Save Button */}
        <button
          className="gcr-save-btn"
          onClick={() => onSave?.(entity)}
        >
          ♡
        </button>

        {/* Image Badges */}
        <div className="gcr-img-badges">
          {entity.live_music && <span className="img-badge music">🎵</span>}
          {entity.outdoor_seating && <span className="img-badge outdoor">🌊</span>}
        </div>

        {/* Price Badge */}
        {entity.price_range && (
          <div className="gcr-badge-price">{entity.price_range}</div>
        )}
      </div>

      {/* Body */}
      <div className="gcr-card-body">
        <div className="gcr-card-name">{entity.name}</div>
        {entity.subtitle && <div className="gcr-card-sub">{entity.subtitle}</div>}
        {entity.city && <div className="gcr-card-city">{entity.city}</div>}

        {entity.description && (
          <div className="gcr-card-desc">{entity.description}</div>
        )}

        {entity.rating && (
          <div className="gcr-card-rating">
            ⭐ {entity.rating}
            {entity.review_count && <span className="review-count">({entity.review_count})</span>}
          </div>
        )}

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="gcr-card-tags">
            {displayTags.map((tag, i) => (
              <span key={i} className={`gcr-tag tag-${getTagColor(tag)}`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Info Rows */}
        <div className="gcr-card-info">
          {entity.hh_start && entity.hh_end && (
            <div className="info-row hh-row">
              🍹 HH {entity.hh_start} – {entity.hh_end}
            </div>
          )}
          {entity.live_music && (
            <div className="info-row music-row">
              🎵 Live music tonight
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="gcr-card-actions">
          <button
            className="action-btn primary"
            onClick={() => navigate(`/business/${entity.slug}`)}
          >
            View Profile
          </button>
          {entity.website_url && (
            <button className="action-btn secondary" onClick={() => window.open('https://' + entity.website_url)}>
              Website
            </button>
          )}
          {entity.directions_url && (
            <button className="action-btn secondary" onClick={() => window.open(entity.directions_url)}>
              Directions
            </button>
          )}
          {entity.phone && (
            <button className="action-btn secondary" onClick={() => window.location.href = `tel:${entity.phone}`}>
              Call
            </button>
          )}
        </div>

        {/* Happy Hour Expandable */}
        {entity.hh_start && entity.hh_end && (
          <button className="hh-expand-btn" onClick={() => setShowHH(!showHH)}>
            {showHH ? '▼ Hide Hours' : '▶ View Happy Hour Details'}
          </button>
        )}

        {showHH && (
          <div className="gcr-hh-panel">
            <div className="hh-title">Happy Hour</div>
            {entity.hh_days && <div className="hh-days">{entity.hh_days}</div>}
            {entity.hh_start && entity.hh_end && (
              <div className="hh-time">{entity.hh_start} – {entity.hh_end}</div>
            )}
            {entity.hh_description && (
              <div className="hh-desc">{entity.hh_description}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
