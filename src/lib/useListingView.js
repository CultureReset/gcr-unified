import { useState, useEffect, useCallback } from 'react'

const KEY = 'gcr:listingView'

/**
 * Which layout a listing page is showing, and why.
 *
 * Two rules do most of the work here:
 *
 *  1. The preference is remembered per user, not per page. Someone who wants
 *     the dense list wants it on Restaurants and on Marinas.
 *
 *  2. Applying a filter or a search auto-flips to the list. Filtering is a
 *     declaration that browsing is over — the user has told us what they want,
 *     so rows of ten-at-a-time become the wrong container for the answer. The
 *     flip is undoable: toggling manually while a filter is active sticks until
 *     the filter clears, so nobody gets trapped.
 *
 * @param {bool} filterActive  whether a filter/search is currently narrowing results
 * @returns {[('browse'|'list'), (v: 'browse'|'list') => void]}
 */
export function useListingView(filterActive) {
  const [pref, setPref] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY)
      return stored === 'list' || stored === 'browse' ? stored : 'browse'
    } catch {
      // Private mode / storage disabled — fall back to the default rather than
      // taking the whole listing page down with it.
      return 'browse'
    }
  })

  // Set when the user overrides the auto-flip; cleared once the filter clears so
  // the next filter auto-flips again.
  const [overrode, setOverrode] = useState(false)

  useEffect(() => {
    if (!filterActive) setOverrode(false)
  }, [filterActive])

  const view = filterActive && !overrode ? 'list' : pref

  const setView = useCallback((v) => {
    setPref(v)
    if (filterActive) setOverrode(true)
    try { localStorage.setItem(KEY, v) } catch { /* non-fatal */ }
  }, [filterActive])

  return [view, setView]
}
