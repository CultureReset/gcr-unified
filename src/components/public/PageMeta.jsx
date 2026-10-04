import { useEffect } from 'react'
import { BRAND } from '../../config'

// Sets the document title, description, canonical link and one JSON-LD block
// for the page. Restores the previous title when the page goes away.
export default function PageMeta({ title, description, canonical, jsonLd }) {
  useEffect(() => {
    const prev = document.title
    const full = [title, BRAND.name].filter(Boolean).join(' · ')
    if (full) document.title = full
    return () => { document.title = prev }
  }, [title])

  useEffect(() => {
    if (!description) return
    const tag = document.querySelector('meta[name="description"]')
    if (!tag) return
    const prev = tag.getAttribute('content')
    tag.setAttribute('content', description)
    return () => { if (prev != null) tag.setAttribute('content', prev) }
  }, [description])

  useEffect(() => {
    if (!canonical) return
    let link = document.querySelector('link[rel="canonical"]')
    const created = !link
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link) }
    const prev = link.getAttribute('href')
    link.setAttribute('href', canonical)
    return () => { if (created) link.remove(); else if (prev) link.setAttribute('href', prev) }
  }, [canonical])

  const json = jsonLd ? JSON.stringify(jsonLd) : ''
  useEffect(() => {
    if (!json) return
    // The prerendered copy of this page carried its own; this one replaces it.
    document.querySelectorAll('script[type="application/ld+json"]:not([data-page-meta])').forEach(s => s.remove())
    const el = document.createElement('script')
    el.type = 'application/ld+json'
    el.dataset.pageMeta = '1'
    el.textContent = json
    document.head.appendChild(el)
    return () => el.remove()
  }, [json])

  return null
}
