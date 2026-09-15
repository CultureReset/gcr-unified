# gcr-unified

Still had the unedited Vite template README (`# React + Vite`). React 19 +
Vite, 77 pages, the most extensively tooled GCR frontend found in this pass —
and, notably, **the one repo besides `gcr-api-clean` itself that points at
the real database by default.**

## This one is wired correctly

`src/config.js`:

```js
export const API_BASE = import.meta.env.VITE_API_BASE || 'https://gcr-api-clean.vercel.app'
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://mkepugvdlktfsossumox.supabase.co'
```

`gcr-api-clean.vercel.app` and Supabase ref `mkepugvdlktfsossumox` — that's
the live `cyber check` project, not one of the decoys. Worth noting given how
many other repos in this pass turned out wired to `launch gcr` or a different
project entirely.

`.env.production` is tracked in git (Firebase web config plus the above) —
Firebase client keys are meant to be public and domain-restricted, so this is
lower severity than the Supabase/Anthropic keys found elsewhere in this pass,
but it's still a committed production env file.

## Prerendering for SEO

`scripts/prerender.mjs`, wired as `postbuild`. The app is a pure
client-rendered SPA — one `index.html`, `document.title` never set in `src/`
— so a crawler that doesn't execute JS sees one blank page for every entity.
This script writes a static `dist/business/<slug>/index.html` per active
entity with a real `<title>`, meta description, OG tags, canonical link, and
JSON-LD, plus `sitemap.xml` and `robots.txt`. Real visitors still get the
full SPA — `main.jsx` mounts and takes over immediately.

## Data tooling

A real set of import/export/verify scripts at the root, not found in most
other repos in this pass:

```
verify-app.mjs · verify-gcr.mjs · verify-live.mjs · verify-navigation.mjs
dump-entire-db.mjs · export-complete-all-data.mjs · export-supabase-complete.mjs
import-from-backup.mjs · import-restaurants.mjs · insert-restaurants-from-backup.mjs
convert-db-to-organized-json.mjs · convert-sql-to-json.mjs
extract-all-businesses.mjs · add-ob-gs-restaurants.mjs
inspect-page.mjs · debug-error.mjs
```

## Layout

```
src/
  pages/         77 files (~38 page/CSS pairs) — ArHunts, ArtistListings,
                ArtistLive, ArtistProfile, Auth, BookRental, BookService,
                Browse, Building, BusinessDetail, and more
  components/    including components/templates/
  services/ · context/ · data/ · utils/ · styles/ · assets/
  config.js       API_BASE, SUPABASE_URL/KEY, DEFAULT_MODE ('browse'|'swipe'),
                 the loyalty/signup SMS number every "text to join" link reads
  categoryMap.js
  App.jsx / App.css · ErrorBoundary.jsx · main.jsx · index.css
scripts/prerender.mjs
```

## Run

```bash
npm run dev
npm run build      # runs prerender.mjs automatically via postbuild
npm run preview
npm run lint
```
