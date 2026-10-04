// Every deployment-specific value comes from the environment (documented in
// .env.example; the public build values live in .env.production). Nothing
// here names a brand, a domain, an area, a phone number or a host.

const env = import.meta.env || {}
const str = (key) => String(env[key] ?? '').trim()
const list = (key) => str(key).split('|').map(s => s.trim()).filter(Boolean)
const trimSlash = (u) => u.replace(/\/+$/, '')

// gcr-api-clean, the only door to business data.
export const API_BASE = trimSlash(str('VITE_API_BASE'))

export const SUPABASE_URL = str('VITE_SUPABASE_URL')
export const SUPABASE_KEY = str('VITE_SUPABASE_KEY')

// Mode: 'browse' or 'swipe'
export const DEFAULT_MODE = str('VITE_DEFAULT_MODE') || 'browse'

// The ONE loyalty/signup SMS number — every "text to join" link reads this.
export const SMS_NUMBER = str('VITE_SMS_NUMBER')

// The public site's identity. A blank value hides whatever would show it.
export const BRAND = Object.freeze({
  name: str('VITE_BRAND_NAME'),
  // The public site's own origin, for canonical links, share links and schema.org.
  siteUrl: trimSlash(str('VITE_SITE_URL')),
  // The region this directory covers, as visitors read it ("Coast · Town · Town").
  regionLabel: str('VITE_REGION_LABEL'),
  // "Powered by …" line on business pages and link pages.
  platformName: str('VITE_PLATFORM_NAME'),
  conciergeName: str('VITE_CONCIERGE_NAME'),
  // Example questions shown in the concierge before the first message ("a|b|c").
  conciergeStarters: list('VITE_CONCIERGE_STARTERS'),
  // The concierge's phone number, when there is one, for "text the concierge".
  conciergeNumber: str('VITE_CONCIERGE_NUMBER'),
  // ISO currency for prices that don't carry their own (e.g. USD).
  currency: str('VITE_CURRENCY'),
})

/** The absolute public URL of a path on this site (relative when no site URL is configured). */
export function siteUrl(path = '/') {
  const p = path.startsWith('/') ? path : `/${path}`
  if (BRAND.siteUrl) return `${BRAND.siteUrl}${p}`
  if (typeof window !== 'undefined' && window.location) return `${window.location.origin}${p}`
  return p
}
