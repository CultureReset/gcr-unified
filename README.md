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



<!-- branches:start -->
## Branches

*Read from GitHub on 2026-09-29. 37 branches.*

- **Default branch on GitHub:** `master`. It does **not** yet have this README or the audit fixes; those are on `claude/repo-code-analysis-y4n1k7`, which contains every commit of `master` and more, so it can be fast-forwarded without losing anything.
- **`claude/repo-code-analysis-y4n1k7`** is where the README audit, the screenshots and the fixes were made.
- **27 other branches hold commits that `claude/repo-code-analysis-y4n1k7` does not have.** The newest is `claude/linux-build-cleanup-dfpu0e` (last commit 2026-09-15, 1 commit not in the work branch). Check those before assuming the work branch is the whole story.

<details><summary>All 37 branches</summary>

| Branch | Last commit | Not in the work branch | Last commit message |
| --- | --- | --- | --- |
| `claude/repo-code-analysis-y4n1k7` (work branch) | 2026-09-29 | - | this README and the audit fixes |
| `claude/linux-build-cleanup-dfpu0e` | 2026-09-15 | 1 | docs: README, and this is the correctly-wired frontend |
| `claude/admin-dashboard-repo-review-47q2vc` | 2026-09-13 | 2 | Stop the Live Feed throwing away every post written for it |
| `claude/gcr-unified-login-styling-1mmsac` | 2026-09-05 | 5 | Fix remaining low-contrast colors in Profile's account/reviews section |
| `claude/gcr-api-claim-docs-g4e42t` | 2026-08-05 | 5 | Correct the page, component and static-file counts |
| `claude/platform-integration-launch-test-abi95i` | 2026-08-04 | 0 | Match the desktop gutters to the page, and stop tracking the Vercel toke |
| `master` (default) | 2026-08-04 | 0 | Match the desktop gutters to the page, and stop tracking the Vercel toke |
| `claude/tourist-dashboard-layout-hi2yxu` | 2026-08-04 | 7 | Listing cards: walk every image and skip the dead ones |
| `claude/new-session-1e1dj0` | 2026-08-04 | 10 | Merge remote-tracking branch 'origin/claude/gcr-unified-listing-layouts- |
| `claude/dashboard-inventory-purposes-m5wtba` | 2026-08-04 | 0 | Add "Claim this business" to every GCR profile page |
| `claude/gcr-unified-listing-layouts-fmjr7q` | 2026-08-04 | 7 | Show artists where they are playing |
| `claude/cybercheck-modular-react-dashboard-7on41c` | 2026-08-03 | 1 | Send the full page event, not just the path |
| `claude/trip-swap-profile-issues-uyibtg` | 2026-07-29 | 2 | Add rain chance to weather bar, expand beach flag estimate |
| `claude/booking-platforms-location-ie8zg9` | 2026-07-27 | 1 | Add full technical audit notes (pages, components, dead code, backend ga |
| `chatgpt/slug-export-20260731` | 2026-07-26 | 0 | Fix more invisible white-on-light text (Building, Group states) |
| `claude/cybercheck-twilio-hardcoding-pj7eyo` | 2026-07-26 | 0 | Fix more invisible white-on-light text (Building, Group states) |
| `claude/gcr-api-sms-functionality-5r2zb5` | 2026-07-26 | 5 | Don't drop gallery-only businesses when rebuilding the swipe deck |
| `claude/twilio-verification-sid-506poy` | 2026-07-26 | 0 | Fix invisible white-on-white text on the setup wizard |
| `claude/gcr-unified-integration-6cghed` | 2026-07-25 | 2 | Add typo-tolerant search results, autocomplete, and category tabs |
| `claude/session-lvki6x` | 2026-07-21 | 0 | Fix fake 'Ask Us' / raw unit tokens shown as prices on profile pages |
| `claude/new-session-na3vlg` | 2026-07-21 | 4 | Fix undefined setUserPhone reference in RestaurantMenu.jsx |
| `claude/universal-booking-platform-t3zdhu` | 2026-07-19 | 0 | Fix photo URLs with unencoded spaces failing to load |
| `claude/database-repo-restructure-fyz0dx` | 2026-07-15 | 2 | Fix hub-page category grouping for business services and wellness |
| `claude/data-structure-impl-sg0g6w` | 2026-07-12 | 1 | Render entity_sections content on RestaurantMenu for non-restaurant page |
| `feature/universal-entity-graph` | 2026-07-12 | 0 | Make QR menu headerless; rebuild standalone artist live page |
| `claude/trip-swipe-bug-tcue5d` | 2026-07-09 | 263 | feat: render deals on business profile pages |
| `claude/gcr-unified-dashboard-sgmaeh` | 2026-07-09 | 260 | Point Reserve.jsx at the real universal booking engine |
| `claude/open-all-757nqr` | 2026-07-08 | 259 | Merge branch 'claude/data-structure-assessment-80j1gq' into master |
| `claude/data-structure-assessment-80j1gq` | 2026-07-08 | 257 | Add customer-facing transportation request page + CTA |
| `claude/fishing-charter-booking-block-qy3l1o` | 2026-07-07 | 251 | Surface entity_policies on profiles; broaden Pricing tab; offering image |
| `claude/project-additions-ho3s7k` | 2026-07-06 | 225 | Fix: Undo didn't retract the swipe event already queued for scoring |
| `claude/dynamic-qr-redirect-yl413t` | 2026-07-05 | 207 | Add /:slug/profile rewrite to song-request.html |
| `claude/supabase-images-gcr-urls-hzxqzl` | 2026-07-04 | 206 | Fix wrong loyalty SMS number on homepage |
| `claude/repo-overview-i1n9da` | 2026-07-03 | 205 | Business profile: hero fallback + sliding event cards |
| `claude/gcr-unified-data-gaps-xxyarl` | 2026-07-02 | 181 | Fix Policies tab: wire to entity_policies instead of a dead FAQ-category |
| `claude/gcr-unified-api-clean-xr4029` | 2026-07-02 | 119 | Universal display + parent-child hub (read-path, additive) |
| `codex/refactor-saved-places-management-in-appcontext` | 2026-06-11 | 64 | Unify saved places through AppContext |

</details>

<!-- branches:end -->

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
npm run lint       # currently fails: there is no eslint.config.* file in the repo
npm run preview
```

`npm run build` needs network access: the postbuild step fetches entities from
`gcr-api-clean` and writes a static `dist/business/<slug>/index.html` (title, meta
tags, JSON-LD) for each one, plus `dist/sitemap.xml` and `dist/robots.txt`. A build
on 2026-09-29 prerendered 1000 pages: the script asks for up to 5000 entities, the API
returned 1000 (`CategoryPage.jsx` also notes a 1000-row API limit), and the script stops
after a short batch, so it does not page further.

Settings (names only): `VITE_API_BASE`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`,
`VITE_DEFAULT_MODE`, `VITE_SMS_NUMBER`, and the `VITE_FIREBASE_*` web-app keys.
`VITE_SUPABASE_URL` defaults to the `cyber check` project; `.env.production` holds
the public client-side values. In `src/`, `VITE_SUPABASE_URL`/`VITE_SUPABASE_KEY` are
read only by `services/supabaseAuth.js`, and the `VITE_FIREBASE_*` keys only by
`services/firebaseAuth.js`; nothing imports either file (Auth.jsx has the Firebase
import commented out). `VITE_DEFAULT_MODE` is imported in `App.jsx` but never used.

## Pages

42 page files in `src/pages/`, 40 of them routed in `src/App.jsx` (`Browse.jsx` and
`Dashboard.jsx` are not routed; `/browse` redirects to `/`): `/` (Landing), `/home`,
`/search`, `/category/:category`, category pages (`/restaurants`, `/coffee`,
`/happy-hours`, `/events`, `/deals`, `/things-to-do`, `/ar-hunts`, `/public-spots`,
`/shopping`, `/nightlife`, `/wellness`, `/marinas`, `/feed`), a business
(`/business/:slug`, `/menu/:slug`, `/review/:slug` (a photo-submission form),
`/links/:slug`), artists (`/artists`,
`/artist/:slug`, `/artist/:slug/live`), stays and rentals (`/staying`, `/rental/:slug`,
`/book-rental/:slug`; `/stays` redirects to `/staying`), services and rides
(`/services`, `/service/:slug`,
`/book-service/:slug`, `/transportation/:slug`), booking (`/reserve/:slug`,
`/confirmation/:type/:id`), the swipe deck (`/swipe/:category`), trips
(`/itinerary`, `/groups`, `/group/:slug`, `/saves`, `/profile`, `/list`,
`/building`, `/setup/*`), sign-in (`/auth`, `/reset`, `/join`) and `/privacy`,
`/terms`. `/home`, `/setup/*`, `/list`, `/building`, `/itinerary`, `/profile`,
`/saves`, `/groups` and `/group/:slug` redirect to `/auth` without a login token
(`RequireAuth` in `App.jsx`). Sign-in is by phone number and a texted code; the
email and password form is still in `Auth.jsx` but unreachable, because the phone/email
toggle is commented out.

## Also in the repo

- **Standalone pages in `public/`**, served by the rewrites in `vercel.json`, not by
  React: `/p/:slug` (a business's page, `biz.html`), `/book/:slug/:app` (checkout with
  optional Stripe deposit, `book.html`), `/u/:code` (a visitor's shared picks),
  `/r/:slug` and `/reviews/:slug` (verified reviews), `/manage/:id` (cancel or
  reschedule a booking), `/waiver/:slug`, `/developers/reviews`, and
  `/:slug/profile` (artist song requests, `song-request.html`). All of them call
  `gcr-api-clean`. `embed.js` and `reviews-embed.js` are paste-in widgets for other
  sites. Also in `public/` and reached by file name: `rides.html` (ride request),
  `menu-update.html`, `review.html`, `card.html` (a personal contact card), `q.html`
  (QR code redirect). `booking.html` links `/css/sales.css` and `/js/sales-config.js`,
  which do not exist in this repo, and `qr-menu.html` is empty.
- **Every route change** posts a page view to `gcr-api-clean` (`/api/gcr/track`).
- **Business pages** (`/business/:slug`) show menus, hours, reviews, photos and
  booking links from `gcr-api-clean`, and have an "Is this your business?" claim form
  that posts to `/api/gcr/claim`. `/deals` lets a visitor post a deal
  (`/api/deals/submit`). A signed-in visitor gets an "Ask a local" chat (`/api/tourist/ai-chat`), an
  itinerary builder (`/api/tourist/build-itinerary`) and optional location sharing (a
  position sent every 30 seconds).
- `src/pages/Dashboard.jsx` is a partly built business dashboard (only its calendar tab
  does anything; the rest are placeholders) that no route reaches; the real dashboards
  are in the two repos named at the top.

## Scripts in the root

The `*.mjs` files in the repo root (`dump-entire-db`, `export-supabase-complete`,
`import-restaurants`, `verify-live` …) are one-off data export, import and
verification scripts from building the directory. They are not part of the site
build (`package.json` runs only `scripts/prerender.mjs`). Several import packages that
are not in `package.json` (`playwright`, `better-sqlite3`, `node-fetch`).

> **Secrets.** `dump-entire-db.mjs` and `export-supabase-complete.mjs` contain a
> Supabase `service_role` key, and `convert-db-to-organized-json.mjs`,
> `convert-sql-to-json.mjs` and `export-complete-all-data.mjs` contain a database
> connection string with its password, all in plain text and tracked in git. Rotate
> them and move them to environment variables. Separately, `.env.vercel` (a Vercel
> token) was tracked in earlier commits; it is now untracked and ignored.

## Related

- `gcr-unified-v2` is a copy of this repo started as the base for a
  structured-data rebuild; see its README.
- `gcr-api-clean` is the API this site reads.
