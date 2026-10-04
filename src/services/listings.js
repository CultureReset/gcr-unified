import { API_BASE } from '../config'
import { hydrateTaxonomy, categoryFilter } from '../categoryMap'

// One request for a listing page's businesses, instead of downloading the
// whole catalogue (five 1000-row batches, one after another, ~10 MB) and
// throwing most of it away. view=list returns card columns and one cover
// photo; the API pages through big categories itself.
export async function fetchListing({ subtypes = [], types = [], topLevel = true, extra = '' } = {}) {
  const params = new URLSearchParams({ view: 'list', limit: '5000' })
  if (topLevel) params.set('top_level', '1')
  if (subtypes.length) params.set('subtypes', subtypes.join(','))
  if (types.length) params.set('types', types.join(','))
  const res = await fetch(`${API_BASE}/api/gcr/entities?${params}${extra}`)
  if (!res.ok) throw new Error(`Failed to load (HTTP ${res.status})`)
  const data = await res.json()
  return data.entities || []
}

// Businesses for one of the app's categories (restaurants, things-to-do…).
// 'feed' is every business.
export async function fetchCategory(category, { extra = '', topLevel = true } = {}) {
  if (category === 'feed') return fetchListing({ topLevel, extra })
  await hydrateTaxonomy(API_BASE)
  return fetchListing({ ...categoryFilter(category), topLevel, extra })
}
