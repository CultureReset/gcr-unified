export const API_BASE = import.meta.env.VITE_API_BASE || 'https://gcr-api-clean.vercel.app'

// No Supabase client here, and no key to configure. Every read goes through
// gcr-api-clean, which is the only thing that talks to the database — see the
// architecture rule in gcr-api-clean/CLAUDE.md.
//
// There used to be a SUPABASE_KEY here feeding src/services/supabaseAuth.js: a
// complete email/password and phone-OTP module talking to the database from
// the browser. Nothing imported it — auth is Firebase (src/services/
// firebaseAuth.js) — and the key was empty, so it sat inert. It is deleted
// rather than left, because inert is not the same as harmless: setting
// VITE_SUPABASE_KEY in Vercel was all it would have taken to put a live
// database credential in every visitor's browser.
//
// Public photo URLs are built from the storage bucket where they are needed;
// that is a public CDN path, not a database connection.

// Mode: 'browse' or 'swipe' (can be overridden via VITE_DEFAULT_MODE)
export const DEFAULT_MODE = import.meta.env.VITE_DEFAULT_MODE || 'browse'

// The ONE loyalty/signup SMS number — every "text to join" link reads this.
// Override per-deploy with VITE_SMS_NUMBER; keywords stay per-surface.
export const SMS_NUMBER = import.meta.env.VITE_SMS_NUMBER || '+12513135464'
