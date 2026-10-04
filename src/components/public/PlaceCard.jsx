// One business in a list: its facts, live availability when it publishes
// any, and save. Everything shown is a field the business has; nothing is
// filled in for it.

import { Link } from 'react-router-dom'
import { fixUrl } from '../../services/gcrApi'
import { formatSubtypeLabel } from '../../categoryMap'
import { useApp } from '../../context/AppContext'
import { track } from '../../services/analytics'

function photoOf(b) {
  const p = b.hero_image_url || b.cover_photo || b.photo_url || (Array.isArray(b.photos) ? (b.photos[0]?.url || b.photos[0]?.image_url || b.photos[0]) : null)
  return typeof p === 'string' ? fixUrl(p) : null
}

function availabilityText(av) {
  if (!av) return null
  const today = new Date().toISOString().slice(0, 10)
  const when = av.dates?.[0] === today ? 'Open today' : av.dates?.[0] ? `Open ${new Date(av.dates[0] + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}` : 'Openings'
  const left = av.remaining != null ? ` · ${av.remaining} left` : ''
  return when + left
}

export default function PlaceCard({ business: b, availability, rank, why, extra }) {
  const { savedPlaces, addSavedPlace, removeSavedPlace } = useApp()
  const saved = savedPlaces?.find(p => p.slug === b.slug)
  const photo = photoOf(b)
  const kind = formatSubtypeLabel(b.entity_subtype || b.entity_type || '')
  const where = [b.city, b.state].filter(Boolean).join(', ')
  const avText = availabilityText(availability)

  function toggleSave() {
    if (saved) removeSavedPlace(saved.id)
    else {
      addSavedPlace({ id: b.id || b.slug, slug: b.slug, name: b.name, hero_image_url: photo, subtitle: b.subtitle || '', rating: b.rating ?? null, price_range: b.price_range || '', latitude: b.latitude, longitude: b.longitude, city: where })
      track('click', { slug: b.slug, target: 'save' })
    }
  }

  return (
    <article className="pl-card">
      <Link to={`/business/${encodeURIComponent(b.slug)}`} className="pl-card-link">
        <div className="pl-card-media">
          {photo ? <img src={photo} alt="" loading="lazy" /> : <span className="pl-card-initial" aria-hidden="true">{(b.name || '?').slice(0, 1)}</span>}
          {rank != null && <span className="pl-card-rank">{rank}</span>}
        </div>
        <div className="pl-card-body">
          <h3 className="pl-card-title">{b.name}</h3>
          <p className="pl-card-meta">
            {[kind, where].filter(Boolean).join(' · ')}
            {b.rating ? <> · <span aria-label={`Rated ${b.rating}`}>★ {Number(b.rating).toFixed(1)}</span></> : null}
          </p>
          {b.subtitle && <p className="pl-card-sub">{b.subtitle}</p>}
          {why && <p className="pl-card-why">{why}</p>}
          {avText && <p className="pl-badge pl-badge--live">{avText}</p>}
        </div>
      </Link>
      <div className="pl-card-actions">
        {extra}
        <button type="button" className={`pl-btn pl-btn--ghost${saved ? ' is-on' : ''}`} aria-pressed={!!saved} onClick={toggleSave}>
          {saved ? '♥ Saved' : '♡ Save'}
        </button>
      </div>
    </article>
  )
}
