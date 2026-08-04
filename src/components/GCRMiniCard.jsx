import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMiniCardFields } from '../lib/miniCardFields'
import './GCRMiniCard.css'

// ─── Mini card ────────────────────────────────────────────────────────────────
//
// The compact counterpart to GCRCard. GCRCard is the "decision" card: it carries
// the description, five tag-chip sections, hours, happy-hour panel, address and
// up to six action buttons, because the stack view is where someone compares
// places they already care about.
//
// This card is the "browse" card, and its skeleton never changes:
//
//   photo · one badge · name · one meta line · up to three foot stats
//
// That restraint is the whole reason a rail works — a rail of full GCRCards is
// just a worse version of the stack. Anything you're tempted to add here almost
// certainly belongs on the profile page instead. The card is a link into the
// profile, not a replacement for it.
//
// Which *facts* land in those slots is per page — a coffee shop lives or dies on
// whether it's still open, a charter boat on price and duration. See
// ../lib/miniCardFields.js for the mapping and the reasoning behind each page.

export default function GCRMiniCard({ entity, category, onSave, savedSlugs }) {
  const navigate = useNavigate()
  const [imgFailed, setImgFailed] = useState(false)

  if (!entity) return null

  const slug = entity.slug || entity.subdomain || entity.id || ''
  const name = entity.name || 'Business'
  const icon = entity.icon || entity.emoji || '📍'

  // Same photo resolution order as GCRCard so a place doesn't show one image in
  // the rail and a different one in the stack.
  const coverPhoto = entity.photos?.find(p => p.is_cover) || entity.photos?.[0]
  const hero = entity.hero_image_url || entity.cover_url ||
    coverPhoto?.url || coverPhoto?.image_url || null

  const isSaved = savedSlugs?.has(slug)
  const { badge, meta, stats } = getMiniCardFields(entity, category)

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

        {badge && (
          <span className={`gcr-mini-status tone-${badge.tone}`}>{badge.label}</span>
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
        {meta && <p className="gcr-mini-meta">{meta}</p>}
        {stats.length > 0 && (
          <div className="gcr-mini-foot">
            {stats.map(s => (
              <span key={s.key} className={`gcr-mini-stat ${s.muted ? 'muted' : ''}`}>{s.label}</span>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}
