import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { shortStatus, fmtDist } from '../lib/hours'
import './GCRMiniCard.css'

// ─── Mini card ────────────────────────────────────────────────────────────────
//
// The compact counterpart to GCRCard. GCRCard is the "decision" card: it carries
// the description, five tag-chip sections, hours, happy-hour panel, address and
// up to six action buttons, because the stack view is where someone compares
// places they already care about.
//
// This card is the "browse" card. It carries five things and nothing else:
//
//   photo · name · subtype + city · rating · one status badge
//
// That restraint is the whole reason a rail works — a rail of full GCRCards is
// just a worse version of the stack. Anything you're tempted to add here almost
// certainly belongs on the profile page instead. The card is a link into the
// profile, not a replacement for it.

export default function GCRMiniCard({ entity, onSave, savedSlugs }) {
  const navigate = useNavigate()
  const [imgFailed, setImgFailed] = useState(false)

  if (!entity) return null

  const slug = entity.slug || entity.subdomain || entity.id || ''
  const name = entity.name || 'Business'
  const icon = entity.icon || entity.emoji || '📍'
  const city = entity.city || ''
  const subtype = (entity.entity_subtype || entity.entity_type || entity.type || '')
    .toLowerCase().replace(/_/g, ' ')

  // Same photo resolution order as GCRCard so a place doesn't show one image in
  // the rail and a different one in the stack.
  const coverPhoto = entity.photos?.find(p => p.is_cover) || entity.photos?.[0]
  const hero = entity.hero_image_url || entity.cover_url ||
    coverPhoto?.url || coverPhoto?.image_url || null

  const rating = entity.rating
  const distLabel = fmtDist(entity.distance_miles)
  const status = shortStatus(entity.hours || [])
  const isSaved = savedSlugs?.has(slug)

  // One line, two facts, in priority order: what it is, then where it is.
  const metaLine = [subtype, city].filter(Boolean).join(' · ')

  return (
    <article
      className="gcr-mini"
      onClick={() => navigate(`/business/${slug}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/business/${slug}`) } }}
      aria-label={name}
    >
      <div className="gcr-mini-img">
        {hero && !imgFailed ? (
          <img
            src={hero}
            alt=""
            onError={() => setImgFailed(true)}
            loading="lazy"
          />
        ) : (
          // CSS-only placeholder, no network dependency — a remote fallback can
          // itself go dead (same reasoning as GCRCard's placeholder).
          <div className="gcr-mini-placeholder"><span>{icon}</span></div>
        )}
        <div className="gcr-mini-scrim" />

        {status && (
          <span className={`gcr-mini-status status-${status.cls}`}>{status.label}</span>
        )}

        <button
          className={`gcr-mini-save ${isSaved ? 'saved' : ''}`}
          aria-label={isSaved ? `Remove ${name} from saved` : `Save ${name}`}
          aria-pressed={!!isSaved}
          onClick={e => { e.stopPropagation(); onSave?.(entity) }}
        >
          {isSaved ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="gcr-mini-body">
        <h3 className="gcr-mini-name">{name}</h3>
        {metaLine && <p className="gcr-mini-meta">{metaLine}</p>}
        <div className="gcr-mini-foot">
          {rating != null && rating !== '' && (
            <span className="gcr-mini-rating">⭐ {Number(rating).toFixed(1)}</span>
          )}
          {distLabel && <span className="gcr-mini-dist">📍 {distLabel}</span>}
        </div>
      </div>
    </article>
  )
}
