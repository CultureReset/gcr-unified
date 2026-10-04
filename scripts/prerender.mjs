#!/usr/bin/env node
/**
 * Postbuild prerender: for every active entity, writes a static
 * dist/business/<slug>/index.html with a unique <title>, meta description,
 * OG tags, canonical link, and JSON-LD — plus dist/sitemap.xml and
 * dist/robots.txt.
 *
 * Why: gcr-unified is a pure client-rendered SPA (one index.html for every
 * route, document.title never set anywhere in src/). Google, and every other
 * crawler that doesn't execute JS, currently sees one page. This gives every
 * entity a real static HTML shell with real content in it. Real users still
 * get the full SPA — main.jsx mounts into #root and takes over immediately,
 * this static content is just what's there for the first paint / crawlers.
 *
 * Run: node scripts/prerender.mjs   (wired as "postbuild" in package.json,
 * runs automatically after `vite build` on `npm run build`)
 *
 * Env vars (read from the environment, then .env.production / .env like Vite;
 * documented in .env.example):
 *   VITE_API_BASE     — gcr-api-clean. Without it nothing is prerendered.
 *   SITE_BASE_URL     — defaults to VITE_SITE_URL
 *   VITE_BRAND_NAME   — appended to titles when set
 *   PRERENDER_LIMIT   — cap the number of entities processed, for a quick test
 *                       run (e.g. PRERENDER_LIMIT=10 node scripts/prerender.mjs)
 *   PRERENDER_MODULES — 1 = also draw each business's inline public modules
 *                       into its static page (engine renderPublic + renderHtml)
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { loadEnv } from 'vite'
import { renderPublic, renderHtml } from '@nextgent/app-engine'
import { businessJsonLd } from '../src/utils/schemaOrg.js'
import { arrangeModules, moduleManifest } from '../src/utils/modules.js'
import { isMissingRoute } from '../src/utils/missingRoute.js'

const env = { ...loadEnv('production', process.cwd(), ''), ...process.env }
const API_BASE = String(env.VITE_API_BASE || '').replace(/\/$/, '')
const SITE_BASE_URL = String(env.SITE_BASE_URL || env.VITE_SITE_URL || '').replace(/\/$/, '')
const BRAND_NAME = String(env.VITE_BRAND_NAME || '').trim()
const DIST_DIR = path.resolve(process.cwd(), 'dist')
const PRERENDER_LIMIT = env.PRERENDER_LIMIT ? parseInt(env.PRERENDER_LIMIT, 10) : Infinity
const PRERENDER_MODULES = env.PRERENDER_MODULES === '1'

// entity_type -> human label used in the <title> tag, e.g. "Restaurant in Gulf Shores, AL"
const TYPE_LABEL = {
  restaurant: 'Restaurant',
  bar: 'Bar',
  coffee: 'Coffee Shop',
  dessert: 'Dessert Shop',
  bakery: 'Bakery',
  hotel: 'Hotel',
  condo: 'Condo Rental',
  'vacation-rental': 'Vacation Rental',
  activity: 'Things to Do',
  park: 'Park',
  shopping: 'Shopping',
  service: 'Service',
}

// entity_type -> singular noun for the auto-generated fallback sentence
// ("X is a ___ in City, AL"), used when an entity has no description at all
// (~1,281 entities as of the June audit) — TYPE_LABEL doesn't read naturally
// mid-sentence ("is a Shopping"), so this is a separate, smaller map.
const FALLBACK_NOUN = {
  restaurant: 'restaurant',
  bar: 'bar',
  coffee: 'coffee shop',
  dessert: 'dessert shop',
  bakery: 'bakery',
  hotel: 'hotel',
  condo: 'vacation rental',
  'vacation-rental': 'vacation rental',
  activity: 'attraction',
  park: 'park',
  shopping: 'shop',
  service: 'local business',
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]))
}

function truncate(str, len) {
  if (!str) return ''
  const s = String(str).trim()
  if (s.length <= len) return s
  return s.slice(0, len - 1).trimEnd() + '\u2026'
}

function buildEntityHtml(template, entity, modulesHtml = '') {
  const category = TYPE_LABEL[entity.entity_type] || 'Business'
  const cityState = [entity.city, entity.state].filter(Boolean).join(', ')
  const title = `${entity.name}${cityState ? ` - ${category} in ${cityState}` : ` - ${category}`}${BRAND_NAME ? ` | ${BRAND_NAME}` : ''}`
  const description = truncate(
    entity.description || entity.editorial_summary || entity.ai_overview ||
    `${entity.name} is a ${FALLBACK_NOUN[entity.entity_type] || 'local business'}${cityState ? ` in ${cityState}` : ''}.`,
    160
  )
  const canonicalUrl = `${SITE_BASE_URL}/business/${entity.slug}`
  const image = entity.hero_image_url || `${SITE_BASE_URL}/gcr-logo.png`

  // One schema.org builder for the SPA and this script (src/utils/schemaOrg.js).
  const jsonLd = businessJsonLd({ ...entity, description }, { url: canonicalUrl, image })

  const staticContent = `
    <div style="max-width:800px;margin:0 auto;padding:24px;font-family:system-ui,sans-serif;line-height:1.5;">
      <h1>${escapeHtml(entity.name)}</h1>
      ${entity.subtitle ? `<p>${escapeHtml(entity.subtitle)}</p>` : ''}
      <p>${escapeHtml(category)}${cityState ? ` in ${escapeHtml(cityState)}` : ''}</p>
      ${entity.rating ? `<p>Rating: ${escapeHtml(entity.rating)} (${escapeHtml(entity.review_count || 0)} reviews)</p>` : ''}
      <p>${escapeHtml(description)}</p>
      ${entity.address_line_1 ? `<p>${escapeHtml(entity.address_line_1)}${cityState ? `, ${escapeHtml(cityState)}` : ''}</p>` : ''}
      ${entity.phone ? `<p>Phone: ${escapeHtml(entity.phone)}</p>` : ''}
      ${modulesHtml || ''}
    </div>`.trim()

  let html = template
  html = html.replace(/<title>.*?<\/title>/s, `<title>${escapeHtml(title)}</title>`)
  html = html.replace(/(<meta name="description" content=")[^"]*(")/, `$1${escapeHtml(description)}$2`)
  html = html.replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${escapeHtml(title)}$2`)
  html = html.replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${escapeHtml(description)}$2`)
  html = html.replace('</head>', `  <meta property="og:image" content="${escapeHtml(image)}" />\n  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />\n  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</head>`)
  html = html.replace('<div id="root"></div>', `<div id="root">${staticContent}</div>`)
  return html
}

// The business's inline public modules, drawn as static HTML by the app
// engine. Uses the gcr-api-clean routes
//   GET /api/public/business/:slug/apps  (entity_modules projection, one row per install)
//   GET /api/public/apps/:installId      ({ manifest, settings, data })
// and stops asking for the rest of the build once the first proves missing
// (the same rule as the SPA: src/utils/missingRoute.js).
let modulesRouteMissing = false
async function fetchModulesHtml(slug) {
  if (!PRERENDER_MODULES || modulesRouteMissing) return ''
  try {
    const res = await fetch(`${API_BASE}/api/public/business/${encodeURIComponent(slug)}/apps`)
    const body = await res.json().catch(() => null)
    if (!res.ok) {
      if (isMissingRoute(res.status, body)) modulesRouteMissing = true
      return ''
    }
    const rows = arrangeModules(Array.isArray(body) ? body : body?.apps || body?.modules || [])
      .filter(m => m.renderMode === 'inline')
    const parts = []
    for (const mod of rows) {
      const r = await fetch(`${API_BASE}/api/public/apps/${encodeURIComponent(mod.installId)}`)
      if (!r.ok) continue
      const app = await r.json()
      const manifest = moduleManifest(mod, app)
      if (!manifest) continue
      const blocks = renderPublic(manifest, app.settings || {}, app.data || {}, {}, {})
      parts.push(`<section>${renderHtml(blocks, { formAction: () => null })}</section>`)
    }
    return parts.join('\n')
  } catch {
    return ''
  }
}

async function fetchAllEntities() {
  const all = []
  let offset = 0
  const pageSize = 5000
  while (true) {
    const res = await fetch(`${API_BASE}/api/gcr/entities?limit=${pageSize}&offset=${offset}`)
    if (!res.ok) throw new Error(`entities fetch failed: ${res.status} ${res.statusText}`)
    const data = await res.json()
    const batch = data.entities || []
    all.push(...batch)
    if (batch.length < pageSize) break
    offset += pageSize
    if (all.length >= PRERENDER_LIMIT) break
  }
  return all.slice(0, PRERENDER_LIMIT)
}

function buildSitemap(entities, sections = []) {
  const staticRoutes = ['', 'directory', 'concierge', 'openings', 'restaurants', 'coffee', 'things-to-do', 'shopping', 'nightlife', 'wellness', 'staying', 'services', 'events', 'deals', 'artists']
  const urls = [
    ...staticRoutes.map(r => `${SITE_BASE_URL}/${r}`.replace(/\/$/, '') || SITE_BASE_URL),
    ...sections.map(sec => `${SITE_BASE_URL}/directory/${encodeURIComponent(sec)}`),
    ...entities.map(e => `${SITE_BASE_URL}/business/${e.slug}`),
  ]
  const body = urls.map(u => `  <url><loc>${escapeHtml(u)}</loc></url>`).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
}

function buildRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_BASE_URL}/sitemap.xml\n`
}

async function main() {
  if (!API_BASE || !SITE_BASE_URL) {
    console.warn('VITE_API_BASE or SITE_BASE_URL/VITE_SITE_URL not set — skipping prerender.')
    return
  }
  if (!existsSync(DIST_DIR)) {
    console.error('dist/ not found — run `vite build` first.')
    process.exit(1)
  }
  const template = await readFile(path.join(DIST_DIR, 'index.html'), 'utf-8')

  console.log(`Fetching entities from ${API_BASE} ...`)
  const entities = await fetchAllEntities()
  console.log(`Got ${entities.length} entities. Prerendering...`)

  let ok = 0, failed = 0
  for (const entity of entities) {
    if (!entity.slug) { failed++; continue }
    try {
      const html = buildEntityHtml(template, entity, await fetchModulesHtml(entity.slug))
      const outDir = path.join(DIST_DIR, 'business', entity.slug)
      await mkdir(outDir, { recursive: true })
      await writeFile(path.join(outDir, 'index.html'), html, 'utf-8')
      ok++
    } catch (err) {
      failed++
      console.warn(`  skip ${entity.slug}: ${err.message}`)
    }
  }

  // Directory sections come from the taxonomy, not a list in code.
  let sections = []
  try {
    const t = await (await fetch(`${API_BASE}/api/gcr/taxonomy`)).json()
    sections = (t.sections || []).filter(x => x.section && x.entity_count > 0).map(x => x.section)
  } catch { /* sitemap without sections */ }
  await writeFile(path.join(DIST_DIR, 'sitemap.xml'), buildSitemap(entities, sections), 'utf-8')
  await writeFile(path.join(DIST_DIR, 'robots.txt'), buildRobots(), 'utf-8')

  console.log(`Done. ${ok} pages prerendered, ${failed} skipped. sitemap.xml + robots.txt written.`)
}

main().catch(err => {
  console.error('Prerender failed:', err)
  // Don't fail the whole Vercel build over this — ship the SPA even if
  // prerendering breaks. Remove this if you'd rather block bad deploys.
  process.exit(0)
})
