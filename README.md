# GulfCoastRadar (gcr-unified)

The public **Gulf Coast Radar** site: a phone-first guide to restaurants, happy
hours, events and live music, things to do, charters and rentals, deals, an AR
hunt, group trips and itineraries, for Orange Beach, Gulf Shores and nearby.
React + Vite. It is the consumer side of the directory; the operator console and
the business owner's dashboard live in `Admin-dashboard-main` and
`Dashboards-users-`. It is **not** part of the Ghost box.

| Home (desktop) | Home (phone) | Events (phone) |
| --- | --- | --- |
| ![Home on a desktop](docs/images/home.png) | ![Home on a phone](docs/images/home-phone.png) | ![Events on a phone](docs/images/events-phone.png) |

*These captures come from this code run locally against a test backend that
returns no listings, so the deal, happy-hour and event lists are empty ("0
events"). They show the layout, not the live content.*

## Where it runs

Vercel project `gcr-unified` serves `gulfcoastradar.com` and
`www.gulfcoastradar.com`; a second project, `gcr-unified2`, is a separate
deployment (its git link is not visible from here). It reads through
`gcr-api-clean` (`VITE_API_BASE`).

## Run it

```bash
npm install
npm run dev        # vite
npm run build      # vite build, then scripts/prerender.mjs (postbuild)
npm run lint
npm run preview
```

Settings (names only): `VITE_API_BASE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`,
`VITE_DEFAULT_MODE`, `VITE_SMS_NUMBER`, and the `VITE_FIREBASE_*` web-app keys.
`VITE_SUPABASE_URL` defaults to the `cyber check` project; `.env.production` holds
the public client-side values.

## Pages

About 40 pages in `src/pages/`, routed in `src/App.jsx`: `/` (Landing), `/home`,
`/browse`, `/search`, category pages (`/restaurants`, `/coffee`, `/happy-hours`,
`/events`, `/deals`, `/things-to-do`, `/ar-hunts`, `/shopping`, `/nightlife`,
`/wellness`, `/marinas`, `/feed`), a business (`/business/:slug`,
`/menu/:slug`, `/review/:slug`, `/links/:slug`), artists (`/artists`,
`/artist/:slug`, `/artist/:slug/live`), stays and rentals (`/staying`, `/rental/:slug`,
`/book-rental/:slug`), services and rides (`/service/:slug`,
`/book-service/:slug`, `/transportation/:slug`), booking (`/reserve/:slug`,
`/confirmation/:type/:id`), the swipe deck (`/swipe/:category`), trips
(`/itinerary`, `/groups`, `/group/:slug`, `/saves`, `/profile`), and sign-in
(`/auth`, `/reset`, `/join`).

## Scripts in the root

The `*.mjs` files in the repo root (`dump-entire-db`, `export-supabase-complete`,
`import-restaurants`, `verify-live` …) are one-off data export, import and
verification scripts from building the directory. They are not part of the site
build.

## Related

- `gcr-unified-v2` is a copy of this repo started as the base for a
  structured-data rebuild; see its README.
- `gcr-api-clean` is the API this site reads.
