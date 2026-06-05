import { useState, useRef, useEffect } from 'react'
import './SwipeCard.css'

export default function SwipeCard({ item, onSwipe, onSave }) {
  const [isDragging, setIsDragging] = useState(false)
  const [translateX, setTranslateX] = useState(0)
  const cardRef = useRef(null)
  const startXRef = useRef(0)
  const currentXRef = useRef(0)

  const handleMouseDown = (e) => {
    setIsDragging(true)
    startXRef.current = e.clientX
    currentXRef.current = 0
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    const diff = e.clientX - startXRef.current
    currentXRef.current = diff
    setTranslateX(diff)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    const threshold = 80
    if (currentXRef.current > threshold) {
      onSwipe('right')
      setTranslateX(500)
    } else if (currentXRef.current < -threshold) {
      onSwipe('left')
      setTranslateX(-500)
    } else {
      setTranslateX(0)
    }
  }

  const handleTouchStart = (e) => {
    setIsDragging(true)
    startXRef.current = e.touches[0].clientX
    currentXRef.current = 0
  }

  const handleTouchMove = (e) => {
    if (!isDragging) return
    const diff = e.touches[0].clientX - startXRef.current
    currentXRef.current = diff
    setTranslateX(diff)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    const threshold = 80
    if (currentXRef.current > threshold) {
      onSwipe('right')
      setTranslateX(500)
    } else if (currentXRef.current < -threshold) {
      onSwipe('left')
      setTranslateX(-500)
    } else {
      setTranslateX(0)
    }
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  const opacity = Math.max(0, 1 - Math.abs(translateX) / 200)
  const rotation = (translateX / 500) * 20

  const imageUrl = item.photos?.[0]?.image_url || item.hero_image_url || item.image_url

  return (
    <div
      ref={cardRef}
      className="swipe-card"
      style={{
        transform: `translateX(${translateX}px) rotate(${rotation}deg)`,
        opacity: opacity > 0.1 ? 1 : 0.1,
        cursor: isDragging ? 'grabbing' : 'grab',
        backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Overlay gradient */}
      <div className="swipe-card-overlay" />

      {/* Content */}
      <div className="swipe-card-content">
        <h3 className="swipe-card-title">{item.name || item.item_name}</h3>

        {/* Location + distance */}
        {(item.city || item.distance_miles != null) && (
          <p className="swipe-card-meta">
            📍 {[item.city, item.state || 'AL'].filter(Boolean).join(', ')}
            {item.distance_miles != null && (
              <span className="swipe-dist"> · {item.distance_miles < 0.1 ? 'Here' : item.distance_miles < 10 ? `${item.distance_miles.toFixed(1)} mi` : `${Math.round(item.distance_miles)} mi`} away</span>
            )}
          </p>
        )}

        {/* Rating */}
        {item.rating && (
          <p className="swipe-card-rating">
            ⭐ {item.rating.toFixed(1)} {item.review_count ? `(${item.review_count})` : ''}
          </p>
        )}

        {/* Description */}
        {item.description && (
          <p className="swipe-card-desc">{item.description.slice(0, 100)}{item.description.length > 100 ? '...' : ''}</p>
        )}

        {/* Floating price badge */}
        {item.price_range && (
          <div className="swipe-card-price-badge">
            💰 From {item.price_range}
          </div>
        )}
        {item.price && (
          <div className="swipe-card-price-badge">
            ${item.price}/night
          </div>
        )}

        {/* Happy Hour */}
        {item.hh_days && (
          <div className="swipe-card-hh-badge">🍺 {item.hh_days}</div>
        )}

        {/* Room details if rental */}
        {(item.bedrooms !== undefined || item.bathrooms !== undefined) && (
          <div className="swipe-card-details">
            {item.bedrooms !== undefined && <span>{item.bedrooms}br</span>}
            {item.bathrooms !== undefined && <span>{item.bathrooms}ba</span>}
            {item.sqft && <span>{item.sqft} sqft</span>}
          </div>
        )}

        {/* Tags/Amenities */}
        {item.tags?.length > 0 && (
          <div className="swipe-card-features">
            {item.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className="swipe-card-feature">
                {typeof tag === 'string' ? tag : tag.tag_name}
              </span>
            ))}
          </div>
        )}

        {/* Features list for activities */}
        {item.features?.length > 0 && (
          <div className="swipe-card-features">
            {item.features.slice(0, 3).map((f, i) => (
              <span key={i} className="swipe-card-feature">{f}</span>
            ))}
          </div>
        )}
      </div>

      {/* Swipe indicators */}
      <div className={`swipe-indicator left ${translateX < -40 ? 'active' : ''}`}>
        ← Pass
      </div>
      <div className={`swipe-indicator right ${translateX > 40 ? 'active' : ''}`}>
        Like →
      </div>

      {/* Action buttons (visible when not swiping) */}
      {!isDragging && (
        <div className="swipe-card-actions">
          <button
            className="swipe-btn swipe-btn-pass"
            onClick={() => onSwipe('left')}
            title="Pass"
          >
            ✕
          </button>
          <button
            className="swipe-btn swipe-btn-save"
            onClick={() => onSave?.()}
            title="Save to trip"
          >
            ♥
          </button>
          <button
            className="swipe-btn swipe-btn-like"
            onClick={() => onSwipe('right')}
            title="Like"
          >
            ✓
          </button>
        </div>
      )}
    </div>
  )
}
