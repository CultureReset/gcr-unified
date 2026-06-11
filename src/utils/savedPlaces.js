export function getPlaceSlug(place) {
  if (typeof place === 'string' || typeof place === 'number') return String(place)
  const slug = place?.slug || place?.entity_slug || place?.subdomain || place?.id
  return slug == null ? '' : String(slug)
}

export function getSavedSlugSet(savedPlaces) {
  return new Set((savedPlaces || []).map(getPlaceSlug).filter(Boolean))
}

export function findSavedPlace(savedPlaces, place) {
  const slug = getPlaceSlug(place)
  if (!slug) return null
  return (savedPlaces || []).find(saved => getPlaceSlug(saved) === slug) || null
}

export function isPlaceSaved(savedPlaces, place) {
  return !!findSavedPlace(savedPlaces, place)
}
