// /directory, /directory/:section — search and browse every business.
// Sections come from gcr-api-clean's taxonomy, areas from the businesses'
// own city values, availability from what businesses publish. Nothing is
// listed in code.

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BRAND, siteUrl, API_BASE } from '../config'
import { fetchTaxonomy, searchDirectory, fetchAvailabilityMap } from '../services/publicApi'
import { fetchCategory } from '../services/listings'
import { subtypeToCategory, formatSubtypeLabel, hydrateTaxonomy } from '../categoryMap'
import { itemListJsonLd, websiteJsonLd } from '../utils/schemaOrg'
import { areaFacets } from '../utils/publicFormat'
import PlaceCard from '../components/public/PlaceCard'
import PinMap from '../components/public/PinMap'
import PageMeta from '../components/public/PageMeta'
import { Loading, Empty, ErrorState } from '../components/public/States'
import '../components/public/public.css'

const PAGE = 30
const today = () => new Date().toISOString().slice(0, 10)

export default function Directory() {
  const { section } = useParams()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') || ''
  const area = params.get('area') || ''
  const onlyOpen = params.get('open') === '1'
  const showMap = params.get('view') === 'map'

  const [sections, setSections] = useState({ status: 'loading', list: [], error: null })
  const [results, setResults] = useState({ status: 'idle', list: [], error: null })
  const [avail, setAvail] = useState({})
  const [shown, setShown] = useState(PAGE)
  const [draft, setDraft] = useState(q)
  const [retry, setRetry] = useState(0)

  useEffect(() => setDraft(q), [q])

  useEffect(() => {
    let live = true
    fetchTaxonomy()
      .then(t => { if (live) setSections({ status: 'ready', list: (t.sections || []).filter(s => s.section && s.entity_count > 0).sort((a, b) => b.entity_count - a.entity_count), error: null }) })
      .catch(error => { if (live) setSections({ status: 'error', list: [], error }) })
    return () => { live = false }
  }, [retry])

  // Live availability: who has published openings from today on.
  useEffect(() => {
    const ctrl = new AbortController()
    const from = today()
    const to = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)
    fetchAvailabilityMap({ dateFrom: from, dateTo: to, signal: ctrl.signal }).then(setAvail).catch(() => {})
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    setShown(PAGE)
    if (!q && !section) { setResults({ status: 'idle', list: [], error: null }); return }
    const ctrl = new AbortController()
    setResults(r => ({ status: 'loading', list: r.list, error: null }))
    const load = q
      ? searchDirectory({ query: q, city: area || undefined, signal: ctrl.signal }).then(d => d?.results || [])
      : hydrateTaxonomy(API_BASE).then(() => fetchCategory(section)).then(list => list.filter(b => subtypeToCategory(b) === section || !subtypeToCategory(b)))
    load
      .then(list => { if (!ctrl.signal.aborted) setResults({ status: 'ready', list: list.filter(b => b?.slug && b?.name), error: null }) })
      .catch(error => { if (error?.name !== 'AbortError') setResults({ status: 'error', list: [], error }) })
    return () => ctrl.abort()
  }, [q, section, area, retry])

  const areas = useMemo(() => areaFacets(results.list), [results.list])
  const filtered = useMemo(() => results.list.filter(b =>
    (!area || String(b.city || '').toLowerCase() === area.toLowerCase() || q) &&
    (!onlyOpen || avail[b.slug])), [results.list, area, onlyOpen, avail, q])
  const openCount = useMemo(() => results.list.filter(b => avail[b.slug]).length, [results.list, avail])

  function setParam(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next, { replace: true })
  }

  function submit(e) {
    e.preventDefault()
    const next = new URLSearchParams()
    if (draft.trim()) next.set('q', draft.trim())
    if (area) next.set('area', area)
    navigate(`/directory${next.toString() ? `?${next}` : ''}`)
  }

  const heading = q ? `Results for “${q}”` : section ? formatSubtypeLabel(section) : (BRAND.name || 'Directory')
  const pageUrl = siteUrl(section ? `/directory/${section}` : '/directory')

  return (
    <main className="pl-page pl-page--wide">
      <PageMeta
        title={q ? `Search: ${q}` : section ? formatSubtypeLabel(section) : 'Directory'}
        canonical={pageUrl}
        jsonLd={results.list.length
          ? itemListJsonLd({ name: heading, url: pageUrl, items: filtered.slice(0, shown).map(b => ({ name: b.name, url: siteUrl(`/business/${b.slug}`) })) })
          : websiteJsonLd({ name: BRAND.name, url: BRAND.siteUrl, searchPath: '/directory?q=' })}
      />
      <header className="pl-hero">
        {BRAND.regionLabel && <p className="pl-eyebrow">{BRAND.regionLabel}</p>}
        <h1 className="pl-h1">{heading}</h1>
        <form className="pl-search" role="search" onSubmit={submit}>
          <label className="pl-sr" htmlFor="dir-q">Search</label>
          <input id="dir-q" type="search" value={draft} onChange={e => setDraft(e.target.value)} placeholder="What are you looking for?" />
          <button type="submit" className="pl-btn pl-btn--primary">Search</button>
        </form>
        <div className="pl-links-row">
          <Link to="/concierge" className="pl-link">Ask the {BRAND.conciergeName || 'concierge'} →</Link>
          <Link to="/openings" className="pl-link">Deals &amp; openings →</Link>
          <Link to="/trip" className="pl-link">Your trip →</Link>
        </div>
      </header>

      <nav className="pl-chips pl-chips--scroll" aria-label="Categories">
        {sections.status === 'loading' && <span className="pl-muted">Loading categories…</span>}
        {sections.status === 'error' && <ErrorState error={sections.error} onRetry={() => setRetry(n => n + 1)} title="Categories didn't load" />}
        {sections.list.map(s => (
          <Link key={s.section} to={`/directory/${encodeURIComponent(s.section)}`} className={`pl-chip${s.section === section ? ' is-on' : ''}`} aria-current={s.section === section ? 'page' : undefined}>
            {formatSubtypeLabel(s.section)} <span className="pl-count">{s.entity_count}</span>
          </Link>
        ))}
      </nav>

      {results.status === 'idle' && sections.status === 'ready' && (
        sections.list.length
          ? <div className="pl-grid-sections">
              {sections.list.map(s => (
                <Link key={s.section} to={`/directory/${encodeURIComponent(s.section)}`} className="pl-section-tile">
                  <span className="pl-section-name">{formatSubtypeLabel(s.section)}</span>
                  <span className="pl-muted">{s.entity_count} places</span>
                </Link>
              ))}
            </div>
          : <Empty title="No categories yet">Businesses will show up here once they are listed.</Empty>
      )}

      {results.status !== 'idle' && (
        <>
          <div className="pl-filters">
            {areas.length > 1 && (
              <label className="pl-filter">
                <span>Area</span>
                <select value={area} onChange={e => setParam('area', e.target.value)}>
                  <option value="">All areas</option>
                  {areas.map(a => <option key={a.name} value={a.name}>{a.name} ({a.count})</option>)}
                </select>
              </label>
            )}
            {openCount > 0 && (
              <label className="pl-filter pl-filter--check">
                <input type="checkbox" checked={onlyOpen} onChange={e => setParam('open', e.target.checked ? '1' : '')} />
                <span>Has openings ({openCount})</span>
              </label>
            )}
            <div className="pl-seg" role="group" aria-label="View">
              <button type="button" className={!showMap ? 'is-on' : ''} aria-pressed={!showMap} onClick={() => setParam('view', '')}>List</button>
              <button type="button" className={showMap ? 'is-on' : ''} aria-pressed={showMap} onClick={() => setParam('view', 'map')}>Map</button>
            </div>
          </div>

          {results.status === 'loading' && !results.list.length && <Loading rows={4} />}
          {results.status === 'error' && <ErrorState error={results.error} onRetry={() => setRetry(n => n + 1)} />}
          {results.status === 'ready' && !filtered.length && (
            <Empty title="Nothing matched">Try fewer words, another area, or a different category.</Empty>
          )}
          {filtered.length > 0 && (
            <>
              <p className="pl-muted" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'place' : 'places'}</p>
              {showMap
                ? <PinMap label={heading} places={filtered.slice(0, 50).map(b => ({ ...b, caption: avail[b.slug] ? 'openings' : '' }))} height={360} />
                : <div className="pl-cards">
                    {filtered.slice(0, shown).map(b => <PlaceCard key={b.slug} business={b} availability={avail[b.slug]} />)}
                  </div>}
              {!showMap && filtered.length > shown && (
                <button type="button" className="pl-btn pl-more" onClick={() => setShown(n => n + PAGE)}>Show more</button>
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}
