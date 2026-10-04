// /openings — deals and last-minute openings that businesses publish
// (GET /api/deals). Only what a business posted; nothing generated here.

import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BRAND, siteUrl } from '../config'
import { fetchOpenings } from '../services/publicApi'
import { dealPrice, whenText } from '../utils/publicFormat'
import { offersJsonLd } from '../utils/schemaOrg'
import { fixUrl } from '../services/gcrApi'
import { track } from '../services/analytics'
import PageMeta from '../components/public/PageMeta'
import { Loading, Empty, ErrorState } from '../components/public/States'
import '../components/public/public.css'

function claimHref(d) {
  if (d.claim_url && /^https?:\/\//.test(d.claim_url)) return d.claim_url
  if (d.claim_phone) return `tel:${d.claim_phone}`
  return null
}

export default function Openings() {
  const [params, setParams] = useSearchParams()
  const todayOnly = params.get('today') === '1'
  const [state, setState] = useState({ status: 'loading', list: [], error: null })
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    setState(s => ({ ...s, status: 'loading', error: null }))
    fetchOpenings({ todayOnly, signal: ctrl.signal })
      .then(list => setState({ status: 'ready', list, error: null }))
      .catch(error => { if (error?.name !== 'AbortError') setState({ status: 'error', list: [], error }) })
    return () => ctrl.abort()
  }, [todayOnly, retry])

  const list = state.list
  return (
    <main className="pl-page">
      <PageMeta
        title="Deals & openings"
        canonical={siteUrl('/openings')}
        jsonLd={list.length ? offersJsonLd({
          name: 'Deals & openings', url: siteUrl('/openings'),
          offers: list.map(d => ({ name: d.headline, price: d.deal_price ?? undefined, currency: d.currency || BRAND.currency || undefined, expiresAt: d.expires_at, url: d.entity_slug ? siteUrl(`/business/${d.entity_slug}`) : undefined, business: d.entity_name })),
        }) : null}
      />
      <header className="pl-hero">
        <h1 className="pl-h1">Deals &amp; openings</h1>
        <p className="pl-muted">Posted by the businesses themselves — spare seats, free tables, specials.</p>
        <div className="pl-seg" role="group" aria-label="When">
          <button type="button" className={!todayOnly ? 'is-on' : ''} aria-pressed={!todayOnly} onClick={() => setParams({}, { replace: true })}>All</button>
          <button type="button" className={todayOnly ? 'is-on' : ''} aria-pressed={todayOnly} onClick={() => setParams({ today: '1' }, { replace: true })}>Today only</button>
        </div>
      </header>

      {state.status === 'loading' && <Loading rows={3} />}
      {state.status === 'error' && <ErrorState error={state.error} onRetry={() => setRetry(n => n + 1)} />}
      {state.status === 'ready' && !list.length && <Empty title="No openings right now">When a business posts one, it shows up here.</Empty>}
      {list.length > 0 && (
        <ul className="pl-offers">
          {list.map(d => {
            const href = claimHref(d)
            const price = dealPrice(d, BRAND.currency)
            const ends = whenText(d.expires_at)
            return (
              <li key={d.id} className="pl-offer">
                {d.image_url && <img src={fixUrl(d.image_url)} alt="" loading="lazy" className="pl-offer-img" />}
                <div className="pl-offer-body">
                  <p className="pl-offer-tags">
                    {d.is_today_only && <span className="pl-badge pl-badge--live">Today</span>}
                    {d.spots_remaining != null && <span className="pl-badge">{d.spots_remaining}{d.spots_total ? ` of ${d.spots_total}` : ''} left</span>}
                    {ends && <span className="pl-badge">Ends {ends}</span>}
                  </p>
                  <h2 className="pl-offer-title">{d.headline}</h2>
                  {d.entity_slug
                    ? <Link to={`/business/${encodeURIComponent(d.entity_slug)}`} className="pl-link">{d.entity_name || d.entity_slug}</Link>
                    : d.entity_name && <p className="pl-muted">{d.entity_name}</p>}
                  {d.description && <p className="pl-offer-desc">{d.description}</p>}
                </div>
                <div className="pl-offer-side">
                  {price && <p className="pl-offer-price">{price}</p>}
                  {href && (
                    <a className="pl-btn pl-btn--primary" href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                      onClick={() => track('click', { slug: d.entity_slug, target: `deal:${d.id}` })}>
                      {d.claim_phone && !d.claim_url ? 'Call to claim' : 'Claim'}
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
