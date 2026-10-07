import BusinessDetail from '../pages/BusinessDetail'
import { EntityPageProvider } from './EntityPageContext'

/**
 * Standalone host proof.
 *
 * Renders the exact same BusinessDetail/Entity data as GCR, but without GCR
 * chrome. Custom-domain resolution can later point here after resolving the
 * hostname to an entity slug.
 */
export default function StandaloneBusinessPage() {
  return (
    <EntityPageProvider
      host="standalone"
      entityHref={(slug) => `/site/${encodeURIComponent(slug)}`}
    >
      <BusinessDetail />
    </EntityPageProvider>
  )
}
