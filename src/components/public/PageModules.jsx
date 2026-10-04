// A business's installed public modules, drawn by the shared app engine.
//
// Which modules a page has, in what order, shown how, comes only from
// gcr-api-clean's runtime projection (business_app_instances): nothing here
// knows any app by name. Each module is one of:
//   inline   its public view drawn in the page
//   button   a button to its own page, /<business>/<app>
//   page     only on its own page (also linked from the page's module list)
//   action   a button in the header action row (Call, Book, Directions …)
// A module's data comes from GET /api/public/apps/:installId through the
// engine's public adapter; a module whose data route is missing simply
// isn't drawn.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EngineApp } from '@nextgent/app-engine/react'
import { createPublicAdapter } from '@nextgent/app-engine'
import { API_BASE } from '../../config'
import { fetchPageModules } from '../../services/publicApi'
import { track } from '../../services/analytics'

export function modulePath(slug, mod) {
  return `/${encodeURIComponent(slug)}/${encodeURIComponent(mod.appKey || mod.installId)}`
}

export function moduleLabel(mod, manifest) {
  const m = manifest || mod.manifest
  const publicSurface = (m?.surfaces || []).find(s => s.kind === 'public')
  return mod.publicLabel || publicSurface?.title || m?.name || mod.appKey.replace(/[-_]/g, ' ')
}

/** The page's module list. `state.status`: loading | ready | absent | error. */
export function usePageModules(slug) {
  const [state, setState] = useState({ status: 'loading', modules: [], shell: null, error: null })
  useEffect(() => {
    if (!slug) return
    const ctrl = new AbortController()
    setState({ status: 'loading', modules: [], shell: null, error: null })
    fetchPageModules(slug, { signal: ctrl.signal })
      .then(({ modules, shell }) => setState({ status: 'ready', modules, shell, error: null }))
      .catch(error => {
        if (error?.name === 'AbortError') return
        // No projection yet (route missing or business has none): the page
        // falls back to its own facts, cleanly.
        setState({ status: error?.notConnected || error?.status === 404 ? 'absent' : 'error', modules: [], shell: null, error })
      })
    return () => ctrl.abort()
  }, [slug])
  return state
}

/** Theme variables from the shell (accent, background, text), when the business set them. */
export function shellStyle(shell) {
  const t = shell?.theme || {}
  const style = {}
  if (t.accent) style['--pl-accent'] = t.accent
  if (t.background) style['--pl-bg'] = t.background
  if (t.text) style['--pl-text'] = t.text
  return style
}

function usePublicApp(mod) {
  const [state, setState] = useState({ status: 'loading', loaded: null, error: null })
  const adapter = useMemo(
    () => createPublicAdapter({ baseUrl: `${API_BASE}/api`, installId: mod.installId }),
    [mod.installId],
  )
  useEffect(() => {
    let live = true
    setState({ status: 'loading', loaded: null, error: null })
    adapter.load()
      .then(loaded => { if (live) setState({ status: 'ready', loaded, error: null }) })
      .catch(error => { if (live) setState({ status: error?.notConnected || error?.status === 404 ? 'absent' : 'error', loaded: null, error }) })
    return () => { live = false }
  }, [adapter])
  return { ...state, adapter }
}

/** One module's public view, drawn by <EngineApp surface="public">. */
export function ModuleView({ mod, slug, compact = false, options }) {
  const { status, loaded, adapter } = usePublicApp(mod)
  const manifest = mod.manifest || loaded?.manifest

  // EngineApp loads through the adapter; hand it what was just fetched the
  // first time instead of asking twice, and count form submissions.
  const engineAdapter = useMemo(() => {
    let first = loaded
    return {
      ...adapter,
      load: async () => {
        if (first) { const l = first; first = null; return l }
        return adapter.load()
      },
      submit: async (...args) => {
        const out = await adapter.submit(...args)
        track('submit', { slug, installId: mod.installId, appKey: mod.appKey })
        return out
      },
    }
  }, [adapter, loaded, slug, mod.installId, mod.appKey])

  const onClick = useCallback((e) => {
    const a = e.target.closest?.('a[href]')
    if (a) track('click', { slug, installId: mod.installId, appKey: mod.appKey, target: a.getAttribute('href') })
  }, [slug, mod.installId, mod.appKey])

  if (status === 'loading') return compact ? null : <div className="pl-module-loading" aria-busy="true" />
  if (status !== 'ready' || !manifest) return null
  return (
    <div className={compact ? 'pl-module-body pl-module-body--compact' : 'pl-module-body'} onClickCapture={onClick}>
      <EngineApp manifest={manifest} surface="public" adapter={engineAdapter} options={options} />
    </div>
  )
}

/** Header action row: the installed action apps, in projection order. */
export function ActionRow({ slug, modules, options }) {
  const actions = modules.filter(m => m.renderMode === 'action')
  if (!actions.length) return null
  return (
    <div className="pl-actions" aria-label="Actions">
      {actions.map(m => <ModuleView key={m.installId} mod={m} slug={slug} compact options={options} />)}
    </div>
  )
}

/** Every non-action module, in projection order: inline ones drawn, the rest as buttons. */
export function ModuleList({ slug, modules, options, headingLevel = 2 }) {
  const shown = modules.filter(m => m.renderMode !== 'action')
  if (!shown.length) return null
  const H = `h${headingLevel}`
  return (
    <div className="pl-modules">
      {shown.map(m => m.renderMode === 'inline' ? (
        <section key={m.installId} className="pl-module" aria-label={moduleLabel(m)}>
          <H className="pl-module-title">
            <Link to={modulePath(slug, m)} onClick={() => track('click', { slug, installId: m.installId, appKey: m.appKey, target: 'module' })}>
              {moduleLabel(m)}
            </Link>
          </H>
          <ModuleView mod={m} slug={slug} options={options} />
        </section>
      ) : (
        <Link
          key={m.installId}
          to={modulePath(slug, m)}
          className="pl-module-button"
          onClick={() => track('click', { slug, installId: m.installId, appKey: m.appKey, target: 'module' })}
        >
          {m.manifest?.icon && <span className="pl-module-icon" aria-hidden="true">{m.manifest.icon}</span>}
          <span>{moduleLabel(m)}</span>
          <span aria-hidden="true" className="pl-chevron">›</span>
        </Link>
      ))}
    </div>
  )
}
