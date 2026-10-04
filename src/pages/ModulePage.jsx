// /<business>/<app> — one installed module on its own page.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchEntity } from '../services/publicApi'
import { siteUrl } from '../config'
import { businessJsonLd } from '../utils/schemaOrg'
import { usePageModules, ModuleView, ActionRow, moduleLabel, shellStyle } from '../components/public/PageModules'
import PageMeta from '../components/public/PageMeta'
import { Loading, Empty, ErrorState } from '../components/public/States'
import { track } from '../services/analytics'
import '../components/public/public.css'

export default function ModulePage() {
  const { business: slug, app } = useParams()
  const page = usePageModules(slug)
  const [entity, setEntity] = useState(null)
  const [entityError, setEntityError] = useState(null)

  useEffect(() => {
    let live = true
    setEntity(null); setEntityError(null)
    fetchEntity(slug).then(e => { if (live) setEntity(e) }).catch(err => { if (live) setEntityError(err) })
    return () => { live = false }
  }, [slug])

  const mod = page.modules.find(m => m.appKey === app || m.installId === app)
  useEffect(() => { if (mod) track('view', { slug, installId: mod.installId, appKey: mod.appKey }) }, [slug, mod])

  const back = <Link to={`/business/${encodeURIComponent(slug)}`} className="pl-back">‹ {entity?.name || 'Back'}</Link>

  let body
  if (page.status === 'loading') body = <Loading />
  else if (page.status === 'error') body = <ErrorState error={page.error} onRetry={() => window.location.reload()} />
  else if (!mod) body = <Empty title="Nothing here">This business has no public page by that name.</Empty>
  else body = (
    <>
      <h1 className="pl-h1">{moduleLabel(mod)}</h1>
      <ModuleView mod={mod} slug={slug} />
    </>
  )

  return (
    <main className="pl-page" style={shellStyle(page.shell)}>
      <PageMeta
        title={[mod ? moduleLabel(mod) : null, entity?.name].filter(Boolean).join(' · ')}
        canonical={siteUrl(`/${slug}/${app}`)}
        jsonLd={entity ? businessJsonLd(entity, { url: siteUrl(`/business/${slug}`) }) : null}
      />
      <div className="pl-topbar">{back}</div>
      {entityError && !entity && page.status !== 'loading' && !mod && <ErrorState error={entityError} />}
      {page.status === 'ready' && <ActionRow slug={slug} modules={page.modules} />}
      {body}
    </main>
  )
}
