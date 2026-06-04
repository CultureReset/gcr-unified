export const API_BASE = import.meta.env.VITE_API_BASE || 'https://gcr-api-clean-fresh.vercel.app'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mkepugvdlktfsossumox.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || ''

// Mode: 'browse' or 'swipe' (can be overridden via VITE_DEFAULT_MODE)
export const DEFAULT_MODE = import.meta.env.VITE_DEFAULT_MODE || 'browse'
