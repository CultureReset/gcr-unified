// /r/c/:code — a concierge results page; /r/t/:code — a shared trip plan.
// Both are short-lived links held by gcr-api-clean (GET /api/public/results/:code).
// Each place is drawn from its own current record, so a link shows today's
// facts, not a copy from when it was made.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BRAND, siteUrl } from '../config'
import { fetchResults, fetchEntity, sendResults } from '../services/publicApi'
import { isExpired, whenText } from '../utils/publicFormat'
import { itemListJsonLd } from '../utils/schemaOrg'
import PlaceCard from '../components/public/PlaceCard'
import PinMap from '../components/public/PinMap'
import PageMeta from '../components/public/PageMeta'
import { Loading, Empty, ErrorState } from '../components/public/States'
import '../components/public/public.css'

function timeLabel(at) {
  if (!at) return ''
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return String(at)
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function ShareBar({ url, title }) {
  const [copied, setCopied] = useState(false)
  async function shareIt() {
    try {
      if (navigator.share) { await navigator.share({ title, url }); return }
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* cancelled */ }
  }
  return (
    <div className="pl-sharebar">
      <input readOnly value={url} aria-label="Link" onFocus={e => e.target.select()} />
      <button type="button" className="pl-btn" onClick={shareIt}>{copied ? 'Copied' : 'Share'}</button>
    </div>
  )
}

function TextMe({ code }) {
  const [phone, setPhone] = useState('')
  const [state, setState] = useState({ status: 'idle', error: null })
  async function submit(e) {
    e.preventDefault()
    setState({ status: 'busy', error: null })
    try { await sendResults(code, phone); setState({ status: 'sent', error: null }) } catch (error) { setState({ status: 'error', error }) }
  }
  if (state.status === 'sent') return <p className="pl-notice">Sent. The text includes this link.</p>
  if (state.error?.notConnected) return null
  return (
    <form className="pl-inline-form" onSubmit={submit}>
      <label htmlFor="textme">Text this link to</label>
      <input id="textme" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Mobile number" required />
      <button type="submit" className="pl-btn" disabled={state.status === 'busy' || !phone.trim()}>Send</button>
      {state.status === 'error' && <p className="pl-error" role="alert">{state.error.message}</p>}
    </form>
  )
}

export default function SharedResults({ kind }) {
  const { code } = useParams()
  const [state, setState] = useState({ status: 'loading', page: null, places: [], error: null })

  useEffect(() => {
    let live = true
    setState({ status: 'loading', page: null, places: [], error: null })
    fetchResults(code)
      .then(async page => {
        const items = Array.isArray(page?.items) ? page.items : []
        const places = await Promise.all(items.map(async it => {
          try { return { ...(await fetchEntity(it.slug)), _item: it } } catch { return null }
        }))
        if (live) setState({ status: 'ready', page, places: places.filter(Boolean), error: null })
      })
      .catch(error => { if (live) setState({ status: error?.status === 404 || error?.status === 410 ? 'gone' : 'error', page: null, places: [], error }) })
    return () => { live = false }
  }, [code])

  const path = `/r/${kind === 'trip' ? 't' : 'c'}/${code}`
  const url = siteUrl(path)
  const { page, places } = state
  const expired = page && isExpired(page.expiresAt || page.expires_at)
  const title = page?.title || (kind === 'trip' ? 'Trip plan' : 'Your picks')

  return (
    <main className="pl-page">
      <PageMeta
        title={title}
        canonical={url}
        jsonLd={places.length ? itemListJsonLd({ name: title, url, items: places.map(p => ({ name: p.name, url: siteUrl(`/business/${p.slug}`) })) }) : null}
      />
      {state.status === 'loading' && <Loading rows={3} />}
      {state.status === 'gone' && (
        <Empty title="This link has ended" action={<Link className="pl-btn" to={kind === 'trip' ? '/trip' : '/concierge'}>{kind === 'trip' ? 'Plan a trip' : 'Ask again'}</Link>}>
          Shared links last a limited time. Start a new one any time.
        </Empty>
      )}
      {state.status === 'error' && <ErrorState error={state.error} onRetry={() => window.location.reload()} />}
      {state.status === 'ready' && (expired ? (
        <Empty title="This link has ended" action={<Link className="pl-btn" to="/directory">Browse instead</Link>}>
          It expired {whenText(page.expiresAt || page.expires_at)}.
        </Empty>
      ) : (
        <>
          <header className="pl-hero">
            {BRAND.name && <p className="pl-eyebrow">{BRAND.name}</p>}
            <h1 className="pl-h1">{title}</h1>
            {page.summary && <p>{page.summary}</p>}
            {(page.expiresAt || page.expires_at) && <p className="pl-muted">Link works until {timeLabel(page.expiresAt || page.expires_at)}.</p>}
          </header>
          {!places.length && <Empty title="No places in this link">The places it named are no longer listed.</Empty>}
          {places.length > 0 && (
            <>
              <ol className={kind === 'trip' ? 'pl-timeline' : 'pl-cards pl-cards--plain'}>
                {places.map((p, i) => (
                  <li key={`${p.slug}-${i}`}>
                    {kind === 'trip' && p._item.at && <p className="pl-time">{timeLabel(p._item.at)}</p>}
                    <PlaceCard business={p} rank={kind === 'trip' ? null : i + 1} why={p._item.why || p._item.note} />
                  </li>
                ))}
              </ol>
              <PinMap label="Map of these places" places={places.map(p => ({ ...p }))} />
            </>
          )}
          <section className="pl-section" aria-label="Share">
            <h2 className="pl-h2">Share</h2>
            <ShareBar url={url} title={title} />
            <TextMe code={code} />
          </section>
        </>
      ))}
    </main>
  )
}
