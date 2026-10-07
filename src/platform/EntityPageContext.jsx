import { createContext, useContext, useMemo } from 'react'

const defaultValue = {
  host: 'gcr',
  entityHref: (slug) => `/business/${encodeURIComponent(slug)}`,
}

const EntityPageContext = createContext(defaultValue)

/**
 * Host boundary for reusable Entity UI.
 *
 * GCR can keep /business/:slug while a standalone business host can provide
 * its own URL strategy without changing cards, relationships, or renderers.
 */
export function EntityPageProvider({ host = 'gcr', entityHref, children }) {
  const value = useMemo(() => ({
    host,
    entityHref: entityHref || defaultValue.entityHref,
  }), [host, entityHref])

  return (
    <EntityPageContext.Provider value={value}>
      {children}
    </EntityPageContext.Provider>
  )
}

export function useEntityPageContext() {
  return useContext(EntityPageContext)
}
