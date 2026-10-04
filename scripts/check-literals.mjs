#!/usr/bin/env node
// CONTRACT §11 check for the public layer: no brand, region, domain, phone
// number or host written into the code. The values this deployment uses are
// read from .env.production (they are config, kept out of code) and searched
// for in every public-layer source file; any hit fails the check, as does any
// URL other than schema.org's own vocabulary.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const FILES = [
  'src/config.js', 'src/services/publicApi.js', 'src/services/analytics.js',
  'src/utils', 'src/components/public',
  'src/pages/Directory.jsx', 'src/pages/Concierge.jsx', 'src/pages/SharedResults.jsx',
  'src/pages/TripPlan.jsx', 'src/pages/Openings.jsx', 'src/pages/ModulePage.jsx',
  'scripts/prerender.mjs',
]

function walk(p) {
  const abs = path.join(root, p)
  if (statSync(abs).isDirectory()) return readdirSync(abs).flatMap(f => walk(path.join(p, f)))
  return /\.(m?js|jsx|css)$/.test(p) ? [p] : []
}

const env = {}
try {
  for (const line of readFileSync(path.join(root, '.env.production'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
} catch { /* no env file: only the generic checks run */ }

const needles = new Set()
const add = v => { if (v && v.length >= 4) needles.add(v.toLowerCase()) }
add(env.VITE_BRAND_NAME)
add(env.VITE_PLATFORM_NAME)
for (const part of String(env.VITE_REGION_LABEL || '').split(/[·,|]/)) add(part.trim())
for (const k of ['VITE_SITE_URL', 'VITE_API_BASE', 'VITE_SUPABASE_URL']) { try { add(new URL(env[k]).host) } catch { /* unset */ } }
for (const k of ['VITE_SMS_NUMBER', 'VITE_CONCIERGE_NUMBER']) add(String(env[k] || '').replace(/\D/g, '').slice(-10))

const URL_RE = /https?:\/\/[^\s'"`)]+/g
const PHONE_RE = /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g
let failures = 0
for (const file of FILES.flatMap(walk)) {
  const text = readFileSync(path.join(root, file), 'utf8')
  const lower = text.toLowerCase()
  for (const n of needles) if (lower.includes(n)) { console.error(`${file}: contains configured value "${n}"`); failures++ }
  for (const u of text.match(URL_RE) || []) if (!u.startsWith('https://schema.org')) { console.error(`${file}: URL ${u}`); failures++ }
  for (const p of text.match(PHONE_RE) || []) { console.error(`${file}: phone-like ${p}`); failures++ }
}
if (failures) { console.error(`${failures} literal(s) that belong in config or data.`); process.exit(1) }
console.log(`No brand, region, domain, host or phone literals in ${FILES.flatMap(walk).length} public-layer files.`)
