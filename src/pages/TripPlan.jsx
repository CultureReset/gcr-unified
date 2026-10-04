// /trip — saved places turned into a plan: give each a time, put them in
// order, see them on a map, and share the plan as a link that expires
// (/r/t/:code, held by gcr-api-clean). Saved places are the ones the app
// already keeps (AppContext; synced to /api/tourist/saves when signed in).

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { siteUrl } from '../config'
import { createResults } from '../services/publicApi'
import { fixUrl } from '../services/gcrApi'
import PinMap from '../components/public/PinMap'
import PageMeta from '../components/public/PageMeta'
import { Empty, ErrorState } from '../components/public/States'
import '../components/public/public.css'

const DRAFT_KEY = 'gcr_trip_plan'

function loadDraft() {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') || {} } catch { return {} }
}

export default function TripPlan() {
  const { savedPlaces, removeSavedPlace } = useApp()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(loadDraft)
  const [title, setTitle] = useState(() => loadDraft().title || '')
  const [share, setShare] = useState({ busy: false, error: null })

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, title })) } catch { /* private mode */ }
  }, [draft, title])

  // Order: the visitor's own order first, then by time, then as saved.
  const ordered = useMemo(() => {
    const order = draft.order || []
    const rank = slug => { const i = order.indexOf(slug); return i < 0 ? Infinity : i }
    return [...(savedPlaces || [])].filter(p => p?.slug).sort((a, b) => rank(a.slug) - rank(b.slug))
  }, [savedPlaces, draft.order])

  const setItem = (slug, patch) => setDraft(d => ({ ...d, items: { ...(d.items || {}), [slug]: { ...(d.items?.[slug] || {}), ...patch } } }))
  const move = (index, dir) => {
    const slugs = ordered.map(p => p.slug)
    const j = index + dir
    if (j < 0 || j >= slugs.length) return
    ;[slugs[index], slugs[j]] = [slugs[j], slugs[index]]
    setDraft(d => ({ ...d, order: slugs }))
  }
  const sortByTime = () => {
    const at = slug => draft.items?.[slug]?.at || '9999'
    setDraft(d => ({ ...d, order: [...ordered].sort((a, b) => at(a.slug).localeCompare(at(b.slug))).map(p => p.slug) }))
  }

  async function shareIt() {
    setShare({ busy: true, error: null })
    try {
      const items = ordered.map(p => ({ slug: p.slug, at: draft.items?.[p.slug]?.at ? new Date(draft.items[p.slug].at).toISOString() : undefined, note: draft.items?.[p.slug]?.note || undefined }))
      const out = await createResults({ kind: 'trip', title: title.trim() || 'Trip plan', items })
      navigate(`/r/t/${encodeURIComponent(out.code)}`)
    } catch (error) {
      setShare({ busy: false, error })
    }
  }

  return (
    <main className="pl-page">
      <PageMeta title="Your trip" canonical={siteUrl('/trip')} />
      <header className="pl-hero">
        <h1 className="pl-h1">Your trip</h1>
        <p className="pl-muted">Your saved places, in the order you'll visit them. Share it and everyone sees the same plan.</p>
      </header>

      {!ordered.length ? (
        <Empty title="Nothing saved yet" action={<Link className="pl-btn pl-btn--primary" to="/directory">Find places</Link>}>
          Tap Save on any place and it lands here.
        </Empty>
      ) : (
        <>
          <label className="pl-field">
            <span>Plan name</span>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Saturday" maxLength={80} />
          </label>
          <div className="pl-row">
            <button type="button" className="pl-btn" onClick={sortByTime}>Sort by time</button>
            <Link to="/itinerary" className="pl-link">Build a day-by-day itinerary →</Link>
          </div>
          <ol className="pl-plan">
            {ordered.map((p, i) => (
              <li key={p.slug} className="pl-plan-item">
                <div className="pl-plan-head">
                  {p.hero_image_url && <img src={fixUrl(p.hero_image_url)} alt="" loading="lazy" />}
                  <div>
                    <Link to={`/business/${encodeURIComponent(p.slug)}`} className="pl-plan-name">{p.name}</Link>
                    {p.subtitle && <p className="pl-muted">{p.subtitle}</p>}
                  </div>
                </div>
                <div className="pl-plan-fields">
                  <label><span>When</span>
                    <input type="datetime-local" value={draft.items?.[p.slug]?.at || ''} onChange={e => setItem(p.slug, { at: e.target.value })} />
                  </label>
                  <label><span>Note</span>
                    <input value={draft.items?.[p.slug]?.note || ''} maxLength={140} onChange={e => setItem(p.slug, { note: e.target.value })} placeholder="Optional" />
                  </label>
                </div>
                <div className="pl-plan-tools">
                  <button type="button" className="pl-btn pl-btn--ghost" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button type="button" className="pl-btn pl-btn--ghost" aria-label={`Move ${p.name} down`} disabled={i === ordered.length - 1} onClick={() => move(i, 1)}>↓</button>
                  <button type="button" className="pl-btn pl-btn--ghost" onClick={() => removeSavedPlace(p.id)}>Remove</button>
                </div>
              </li>
            ))}
          </ol>
          <PinMap label="Map of your trip" places={ordered} />
          <div className="pl-row">
            <button type="button" className="pl-btn pl-btn--primary" disabled={share.busy} onClick={shareIt}>{share.busy ? 'Making a link…' : 'Share this plan'}</button>
          </div>
          {share.error && <ErrorState error={share.error} title={share.error.notConnected ? 'Sharing is not switched on yet' : 'Could not make the link'} />}
        </>
      )}
    </main>
  )
}
