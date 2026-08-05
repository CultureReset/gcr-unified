# gcr-unified — The Complete Wiring Blueprint

A read-not-remembered teardown of the tourist front end. Every file, every
route, every API path, every surface — including the 24 static HTML pages that
sit beside the React app and are easy to miss. Computed from the actual code on
`main` (HEAD `d8e5d63`, 2026-08-05).

**Scope measured on disk:** ~36,400 lines of JS/JSX/CSS across ~180 files.
77 files in `src/pages/` (38 screens + 38 stylesheets), 35 in `src/components/`,
5 services, 1 context, 1 build script, 16 root one-off scripts, and **24 static
pages in `public/`** wired by 9 Vercel rewrites.

This is the fourth and largest of the front ends, and the **oldest in
character**: where the two dashboards are descriptor-driven and heavily
commented, this one is a hand-written SPA with a 2,467-line detail page, three
generations of auth code on disk, and a stock Vite template for a README.

> **Read §16.1 first.** A live `service_role` key for the production database is
> committed to this repository in two root scripts.

---

## 0. What this repo is

A Vite + React 19 SPA with `react-router-dom`, deployed to Vercel as
`gulfcoastradar.com`. It is the consumer product: the public directory, the
Trip Swipe deck, the tourist account, and the booking/reservation flows.

Three things distinguish it from the other three repos:

1. **It is two applications in one deployment.** The React SPA under `src/`,
   *and* 24 standalone HTML pages under `public/` served by explicit Vercel
   rewrites — `biz.html`, `book.html`, `manage.html`, `waiver.html`,
   `song-request.html`, `verified-review.html` and more. Those are the public
   faces of `gcr-api-clean/routes/platform.js` (the universal booking engine),
   and nothing in `src/` imports or links to most of them.
2. **It has no endpoint registry.** Where `Admin-dashboard-main` centralises 275
   paths in one file and `Dashboards-users-` centralises 22, this app spreads
   **101 distinct API paths across 22 routers** through 40-odd files, each with
   its own `fetch`. There is no shared HTTP client — `AppContext` has one, and
   most pages ignore it.
3. **It reaches into the legacy API.** `src/pages/Dashboard.jsx` calls
   `/api/dashboard/*` — the `site_id`-keyed legacy router — from inside the
   tourist app.

### Where it sits

| Repo | Talks to | Registry? |
|---|---|---|
| `gcr-api-clean` | Postgres | — |
| `Admin-dashboard-main` | `/api/admin/*` (275 paths) | yes, `api/endpoints.js` |
| `Dashboards-users-` | `/api/business/*` (22 paths) | yes, `lib/endpoints.js` |
| **`gcr-unified`** | **22 routers, 101 paths** | **no** |

---

## 1. Entry, boot & routing

### `index.html` (40)

PWA shell. Two details worth carrying:

- **`<meta name="referrer" content="no-referrer">`** — with a real reason:
  *"Many external photo CDNs (rental managers, booking platforms) refuse
  hotlinked requests that carry a foreign Referer; sending none makes image
  requests look like direct opens, which they allow."* That one line is why
  third-party rental photos render at all.
- Full Apple PWA meta set, `manifest.json`, OG tags, theme colour `#0a0a14`.

### `src/main.jsx` (13) / `src/ErrorBoundary.jsx` (30)

A minimal class boundary — message plus a Reload button. Notably **less
capable than `Admin-dashboard-main`'s `SectionBoundary`**: it wraps the entire
app, so any render error anywhere blanks the whole page rather than one section.

### `src/config.js` (11)

```
API_BASE     VITE_API_BASE || 'https://gcr-api-clean.vercel.app'
SUPABASE_URL VITE_SUPABASE_URL || 'https://mkepugvdlktfsossumox.supabase.co'
SUPABASE_KEY VITE_SUPABASE_KEY || ''
DEFAULT_MODE VITE_DEFAULT_MODE || 'browse'
SMS_NUMBER   VITE_SMS_NUMBER || '+12513135464'
```

`SUPABASE_URL`/`SUPABASE_KEY` are **vestigial** — the only consumer,
`services/supabaseAuth.js`, is imported by nothing (§16.2). `SMS_NUMBER` is
described as *"The ONE loyalty/signup SMS number — every 'text to join' link
reads this."*

### `src/App.jsx` (214) — the router and four cross-cutting effects

**53 routes.** Public: `/`, `/search`, `/category/:category`, `/auth`,
`/reset`, `/join`, `/privacy`, `/terms`, `/review/:slug`, `/menu/:slug`,
`/artists`, `/artist/:slug`, `/artist/:slug/live`, `/staying`,
`/rental/:slug`, `/book-rental/:slug`, `/confirmation/:type/:id`, `/services`,
`/service/:slug`, `/book-service/:slug`, `/reserve/:slug`,
`/transportation/:slug`, `/swipe/:category`, `/business/:slug`,
`/links/:slug`, `/deals`, `/events`, `/feed`, `/ar-hunts`, and the nine
`CategoryPage` routes (`/restaurants`, `/coffee`, `/happy-hours`,
`/things-to-do`, `/public-spots`, `/shopping`, `/nightlife`, `/wellness`,
`/marinas`).

Behind `RequireAuth`: `/setup/*`, `/home`, `/list`, `/building`, `/itinerary`,
`/profile`, `/saves`, `/groups`, `/group/:slug`.

Four effects, each with its reasoning in the file:

- **`hideNav` / `hideHeader`** — a maintained list of chrome-less routes, and
  the comment is a bug post-mortem: Swipe *"builds its own full-screen header
  […] It was missing from this list, so the global header + fixed bottom nav
  were stacking on top of it, squeezing the swipe deck's own action-button row
  down until it overlapped the fixed bottom nav and became partly unclickable."*
  It also records a **reversal**: `/business/*` used to be chrome-less *"but
  BusinessDetail never actually built its own replacement chrome (unlike
  Swipe)."*
- **`gcr:unauthorized` listener** — a global 401 handler with a public-path
  allowlist, so a signed-out visitor on a public page is not bounced to `/auth`.
- **`data-shell`** — publishes `navy` / `black` / `light` on the root so the
  desktop gutters match the page. *"That background is white […] which framed
  the two dark ones — the landing page and the swipe deck — in a pair of bright
  bars."*
- **Route tracking** — every navigation `POST`s to `/api/gcr/track` with
  `page_path`, `referrer`, a `sessionStorage` session id, device class and
  sticky UTM parameters (read from the query string once, then remembered).
  `keepalive: true`, failures swallowed.

`hydrateTaxonomy(API_BASE)` runs once at mount — see §3.

### `vercel.json` — 9 rewrites into the static surface

| Route | Serves |
|---|---|
| `/:slug/profile` | `song-request.html?slug=:slug` |
| `/p/:slug` | `biz.html` |
| `/book/:slug/:app` | `book.html` |
| `/u/:code` | `user.html` |
| `/r/:slug` | `verified-review.html` |
| `/reviews/:slug` | `review-wall.html` |
| `/manage/:id` | `manage.html` |
| `/waiver/:slug` | `waiver.html` |
| `/developers/reviews` | `reviews-api.html` |
| `/(.*)` | `index.html` (the SPA) |

**These nine URLs never reach React.** They are the consumer face of
`platform.js` — `/page/:slug`, `/page/:slug/submit/:appId`, `/manage/:id`,
`/waiver-sign/:slug`, `/u/:code`. §11 covers them.

### `package.json`

Runtime dependencies: `react`, `react-dom`, `react-router-dom`,
`@react-spring/web`, `react-tinder-card` (the swipe deck),
`@supabase/supabase-js`, `firebase`, **and `pg`**.

The last three are all dead weight (§16.2). **`pg` is a Node Postgres driver in
a browser application's runtime dependency list** — it comes from the root
one-off scripts and does not belong in `dependencies`.

Scripts: `dev`, `build`, **`postbuild: node scripts/prerender.mjs`**, `lint`
(eslint), `preview`.

---

## 2. State — `src/context/AppContext.jsx` (523)

The single React context, and the closest thing to an HTTP client.

**The guest-identity model, and the best-argued code in the repo:**

> A signed-out visitor still gets an identity: a random id minted once and kept
> in localStorage, sent as `X-Guest-Id` on every request that doesn't have a
> real login token. None of the `tourist_swipe_events`/`tourist_seen`/
> `tourist_saves`/`user_preference_scores` tables have a foreign key back to a
> real account, so the backend can safely record activity under this id **from a
> visitor's very first swipe** — and merge it into their real account the moment
> they sign up.

`anonymousVisitorId()` is exported and sent alongside signup/signin so the
backend can find and reassign the rows. That is the client half of
`tourist-auth.js`'s `backfillAnonymousActivity()`.

`authHeaders()` is the switch: a real token → `Authorization: Bearer`; no token
→ `X-Guest-Id`. `apiGet`/`apiSend` treat a 401 by calling `handleUnauthorized()`
(which dispatches `gcr:unauthorized`) and returning `null` — **every failure
returns `null`, so callers cannot distinguish "no data" from "request failed."**

Session keys in `localStorage`: `gcr_access_token`, `gcr_refresh_token`,
`gcr_expires_at`, `gcr_user_id`, `gcr_user_email`, plus `gcr_guest_id`.

Covers: `/api/tourist/me`, `/profile`, `/saves`, `/seen`, `/swipes`,
`/super-likes`, `/itinerary`, and wraps `locationService`.

---

## 3. The taxonomy bridge — `src/categoryMap.js` (171)

`SUBTYPE_TO_CATEGORY` maps ~250 Google-Places subtypes onto the nine listing
pages (restaurants / coffee / shopping / things-to-do / public-spots /
nightlife / wellness / services / staying), plus `subtypeToCategory(entity)`
and `hydrateTaxonomy(API_BASE)`.

**This file is a declared mirror.** `gcr-api-clean/utils/listing-category-map.js`
(167 lines) is the server copy, and the API blueprint flags it: *"⚠ MIRROR of
gcr-unified/src/categoryMap.js […] must be kept in sync with the frontend or the
server-paginated endpoint and the client filter will silently disagree."*

`hydrateTaxonomy()` is the mitigation: at boot it pulls `GET /api/gcr/taxonomy`
(293 curated subtypes from `subtype_taxonomy`) and merges it over the static map,
so a subtype added server-side lands without a deploy. The static map remains
the first-paint fallback.

`src/utils/templateCategory.js` (45) sits on top, splitting `things-to-do` into
`rentals` / `tours-charters` / `attractions`, *"since Coyote Beach Sports is a
rental business: pricing-grid-forward, 'choose your gear'. Pure Aloha Adventures
is a tour: schedule/booking-forward."*

---

## 4. `src/services/gcrApi.js` (680) — the data layer

The one shared data module. Fifteen exports.

**`cachedFetchJson(url, { ttlMs = 60000 })`** — an in-memory response cache
keyed by URL:

> The SPA has no router-level data cache, so every navigation (including back to
> a page you were just on) re-fetches over the network. […] Keyed by URL, so any
> call site fetching the same endpoint shares a hit — e.g. a business card
> preview and its detail page reuse one cache entry.

**`fixUrl(u)`** — *"every image src anywhere in the app should pass through this
before rendering."* Protocol-relative → https; clamps Google Places `maxwidth`
to 800; and percent-encodes **literal spaces only**, because *"already
percent-encoded URLs (e.g. trackhs.com's `%3A`-encoded paths) aren't
double-encoded."*

**`toCard(entity, photos)`** — the normaliser, carrying two bug ledgers:

- `tag_name` is the field the API returns. *"Without `tag_name` here, every tag
  silently dropped out of the swipe cards."*
- **Two category systems on one card, deliberately:** `category` is the crude
  5-bucket system (`food`/`stay`/`nightlife`/`shopping`/`activities`) that
  `EntityCard`, `HubTemplate` and Home's rails already depend on; `section` is
  the real 9-way split from `subtypeToCategory`, added *"so the swipe deck can
  offer every real section on the platform without touching what `category`
  means anywhere else it's already relied on."*
- Photos: rows tagged `usage_note === 'Trip Swipe'` win over the general gallery
  — a curated deck image, falling back to everything.

**The preference engine** — `fetchPreferences()`, `scoreCard(card, prefMap)`,
`personalizeAndSort(cards, prefMap)`. This is the client half of
`tourist.js`'s `user_preference_scores`.

Also: `calcDistance`/`formatDistance` (haversine), `fetchBusinesses`,
`fetchBusinessBySlug`, `fetchLiveNow`, `fetchChildRentals`, `searchProperties`,
`saveItem`/`unsaveItem`, `fetchHomeFeed`.

---

## 5. The other services

| File | Lines | Status |
|---|---|---|
| `locationService.js` | 174 | **live.** Haversine, permission request, `watchPosition` tracking, and `POST /api/tourist/location` + `/location-settings` — the client half of `tourist.js`'s geofence SMS. |
| `compassService.js` | 38 | **live.** `bearingTo`, `relativeBearing`, `headingFromOrientationEvent` for the AR overlay. Handles the iOS/other split precisely: *"iOS Safari exposes `webkitCompassHeading` directly (already tilt-compensated) […] other browsers only give tilt-compensated absolute heading via `alpha` on an *absolute* event, which counts counter-clockwise […] so it needs inverting."* |
| `supabaseAuth.js` | 156 | **dead.** Email signup/signin, phone OTP, session handling against a browser Supabase client. **Imported by nothing.** |
| `firebaseAuth.js` | 96 | **dead.** Firebase phone OTP with invisible reCAPTCHA. Its only import, in `Auth.jsx:6`, is commented out. |

Three generations of tourist auth are on disk; only one — `POST
/api/tourist-auth/*` — is wired.

---

## 6. The API surface — 101 paths across 22 routers

No registry, so this is extracted from the source:

| Router | n | Reached from |
|---|---|---|
| `/api/tourist` | 26 | `AppContext`, `Profile`, `Setup`, `Groups`, `Group`, `Invite`, `Building`, `Itinerary`, `ReviewUpload`, `AiChat`, `ReviewsSection`, `BusinessDetail`, `locationService`, `gcrApi` |
| **`/api/gcr`** | **20** | `Landing`, `Search`, `CategoryPage`, `CategoryListings`, `RentalListings`, `Events`, `LiveFeed`, `Swipe`, `Browse`, `BusinessDetail`, `LinksPage`, `Reserve`, `ArtistLive`, `ClaimBusiness`, `LocationPicker`, `App`, `gcrApi` |
| `/api/tourist-auth` | 10 | `Auth`, `Reset`, `Profile` |
| `/api/dashboard` | 6 | **`Dashboard.jsx` only — the legacy router** |
| `/api/platform` | 5 | `Profile` (bookings, rewards, redeem, share, videos) |
| `/api/artists` (4) + `/api/artist-bookings` (1) | 5 | `ArtistListings`, `ArtistProfile`, `ArtistLive` |
| **`/api/admin`** | **4** | **`Swipe.jsx`, `gcrApi.js` — see §16.3** |
| `/api/deals` | 3 | `Deals`, `gcrApi` |
| `/api/services` | 3 | `ServiceDetail`, `BookService` |
| `/api/reviews` (2), `/api/rentals` (2), `/api/bookings` (2), `/api/availability` (2), `/api/gallery` (2), `/api/ar-hunts` (2), `/api/email-parser` (2) | 14 | detail pages, calendars, `ReviewsSection`, `GallerySection` |
| `/api/blog`, `/api/faqs`, `/api/team`, `/api/public/menu`, `/api/transportation` | 5 | mini-site sections, `RestaurantMenu`, `Reserve`, `TransportationRequest` |

`/api/gcr` is the spine: `entities`, `entity/:slug`, `search`, `search/suggest`,
`home-feed`, `events`, `happy-hours`, `live-now`, `sections`, `stay-units`,
`social-posts/feed`, `availability-search`, `locations/autocomplete`,
`entities/:slug/children`, `artist/:slug/live`, `claim`, `opt-in`, `track`,
`waiver/:slug/sign`.

---

## 7. The screens — `src/pages/` (38, ~15,600 lines JSX)

### 7.1 The four giants

**`BusinessDetail.jsx` (2,467 + 1,838 CSS) — `/business/:slug`.** The single
largest file across all four repos. Renders `buildFullEntity`'s entire payload:
hero, hours, menu/drinks/happy-hour, offerings, specials, events, photos, team,
FAQs, policies, blog, reviews, amenities, industry facts, parent/hub, nearby,
availability. Calls `/api/gcr/entity/:slug`, `/api/reviews/:slug(/stats)`,
`/api/team/:slug`, `/api/faqs/:slug`, `/api/blog/:slug`,
`/api/email-parser/availability/:slug`, `/api/tourist/track-click`.

That last one is the attribution loop: an outbound Book/Order/Reserve click is
logged to `tourist_click_events` and returns a `click_id` appended to the
outbound URL as `gcr_ref`.

**`Swipe.jsx` (1,583 + 1,379 CSS) — `/swipe/:category`.** The Trip Swipe deck.
`react-tinder-card` + `@react-spring/web`. Builds its own full-screen chrome.
Reads the deck via `gcrApi`, the social feed via `/api/gcr/social-posts/feed`,
and records swipes through `AppContext` (`/api/tourist/swipes`, `/seen`,
`/saves`, `/super-likes`) — which work signed-out via `X-Guest-Id`.

**`Landing.jsx` (915 + 837 CSS) — `/`.** The homepage, `data-shell="navy"`.
Consumes `/api/gcr/home-feed` and `/api/gcr/entities`. Carries `dedupeByName()`
with its own reasoning: *"a business scraped from more than one source can end
up as multiple entity rows with slightly different name strings. Without this,
the homepage rails could feature the same business twice among only ~10-12
slots."* The dedupe prefers the row whose slug has no hash suffix.

**`Profile.jsx` (844) — `/profile`.** The account hub, and the widest API fan-out
of any page: `/api/tourist/{profile,points,photos,reviews,groups,upload-media}`,
`/api/tourist-auth/{add-email,verify-add-email}`, and five `/api/platform/*`
routes (`my-bookings`, `rewards/:slug`, `redeem`, `my-share`, `my/videos`).
Client-side image compression before upload — *"so we're not shipping multi-MB
originals into the photos table."*

### 7.2 Discovery & directory (9)

`Search.jsx` (769) — text search (`/api/gcr/search`, `/search/suggest`) **and**
date search (`/api/gcr/availability-search`) with six vertical filters
(`all`/`charter`/`photographer`/`rental`/`activity`/`stay`).
`CategoryPage.jsx` (256) serves nine routes from one component.
`CategoryListings.jsx` (257) is `/category/:category`. `Browse.jsx` (67) reads
`/api/gcr/sections`. `Events.jsx` (408), `Deals.jsx` (713 — *"Displays all
active deals from `gcr_deals` […] Also surfaces in: swipe deck, live feed, SMS
blasts"*), `LiveFeed.jsx` (152), `ArHunts.jsx` (263), `Home.jsx` (339).

### 7.3 Vertical detail & booking (9)

`RentalListings` (378) → `RentalDetail` (537) → `BookRental` (199) over
`/api/rentals/*`. `ServiceListings` (231) → `ServiceDetail` (455) →
`BookService` (159) over `/api/services/*`. `Reserve.jsx` (396) is the richest:
`/api/gcr/entity/:slug`, `/api/gcr/opt-in` (pre-checkout consent capture),
`/api/gcr/waiver/:slug/sign`, `/api/email-parser/manual`, and
`/api/transportation/request`. `TransportationRequest` (186),
`Confirmation` (115).

### 7.4 Account, social & artist (13)

`Auth.jsx` (538) — email + phone-OTP over `/api/tourist-auth/*`, with the
Firebase import commented out. `Reset` (94), `Invite` (94), `Setup` (313),
`Saves` (114), `MyList` (107), `Itinerary` (168), `Building` (127 — the AI
trip builder, `/api/tourist/build-itinerary`), `Groups` (187), `Group` (172),
`ReviewUpload` (123), `Privacy` (52), `Terms` (50), `NotFound` (18).

`ArtistListings` (123), `ArtistProfile` (326), **`ArtistLive` (231)** — the
fan-facing money layer: `/api/artists/:slug/queue` and `/request`, plus
`/api/gcr/artist/:slug/live`. `Dashboards-users-`'s `PORT_REVIEW.md` names this
file specifically: *"`ArtistLive.jsx` needs to read `artist_price_tiers` and
`tip_links` instead of computing multiples of `default_min`."*

`RestaurantMenu.jsx` (249) — `/menu/:slug`, reading `/api/public/menu` (the
legacy read-mirror). `LinksPage.jsx` (211) — `/links/:slug`.

**`Dashboard.jsx` (434)** — a *business* dashboard inside the tourist app,
calling `/api/dashboard/{businesses,units,ical/external,ical/feed-url}`. It is
**not routed in `App.jsx`** — unreachable through the router, though the file
still compiles and ships.

---

## 8. Components — `src/components/` (35, ~6,000 lines)

| Component | Lines | Role |
|---|---|---|
| `GCRCard.jsx` (+330 CSS) | 470 | the universal listing card |
| `ReviewsSection.jsx` | 253 | `/api/reviews/:slug(/stats)` + `/api/tourist/reviews` — the verified-review entry |
| `HubTemplate.jsx` (+280 CSS) | 219 | parent/child hub rendering (a condo complex and its units) |
| `ArCameraOverlay.jsx` (+130) | 203 | the AR hunt camera, driven by `compassService` |
| `AiChat.jsx` (+244) | 203 | the floating concierge → `POST /api/tourist/ai-chat` — the **modern** concierge with `conciergeTools` + memory |
| `AvailabilityCalendar.jsx` (+171) | 194 | `/api/availability/resource/:id(/quote)` |
| `ClaimBusiness.jsx` (+157) | 193 | `POST /api/gcr/claim` on every profile page |
| `InstallBanner.jsx` | 183 | PWA install prompt |
| `SectionRenderer.jsx` (+58) | 163 | renders `entity_sections` + items generically |
| `BookingCalendar.jsx` | 162 | `/api/bookings/:slug(/availability)` |
| `LocationPicker.jsx` (+119) | 133 | `/api/gcr/locations/autocomplete` |
| `GallerySection` 127 · `GCRHeader` 114 (+278) · `IndustryFacts` 109 · `BlogSection` 102 · `EntityCard` 98 · `PoliciesSection` 67 · `TeamSection` 61 · `BottomNav` 52 · `SkeletonLoader` 40 · `PageHeader` 37 · `Toast` 25 | | mini-site sections and chrome |

`MiniSiteComponents.css` (730) is the largest stylesheet — the shared look for
the section components.

**`AiChat` is the notable one architecturally.** The API blueprint's Appendix D.4
records that the three chatbots in `public.js` run on the *legacy* schema and
cannot see modern entity data. `AiChat` here calls `/api/tourist/ai-chat`
instead — the modern concierge that uses the shared `conciergeTools` and reads
the full `entity_slug` world. **The tourist site is already on the right one.**

---

## 9. Styling

`src/index.css` (294) holds the tokens and shell. Every page and most
components ship a co-located stylesheet — 38 under `pages/`, 15 under
`components/`, plus `styles/EntityCard.css` (190). Largest:
`BusinessDetail.css` (1,838), `Swipe.css` (1,379), `Landing.css` (837),
`RentalDetail.css` (796), `Search.css` (768), `MiniSiteComponents.css` (730),
`ServiceDetail.css` (719).

App column capped at `--max-w` (900px above 1000px), with `data-shell` on the
root colouring the gutters.

---

## 10. `scripts/prerender.mjs` (245) — the SEO layer

Wired as `postbuild`, so it runs on every `npm run build`. The problem it
solves, from its own header:

> gcr-unified is a pure client-rendered SPA (one `index.html` for every route,
> `document.title` never set anywhere in `src/`). Google, and every other crawler
> that doesn't execute JS, currently sees one page.

For every active entity it writes `dist/business/<slug>/index.html` with a
unique `<title>`, meta description, OG tags, canonical link and JSON-LD, plus
`dist/sitemap.xml` and `dist/robots.txt`. `entity_type` → schema.org `@type`,
falling back to `LocalBusiness` — *"deliberately not trying to be exhaustive,
just correct for the high-volume buckets."* Real users still get the SPA;
`main.jsx` mounts into `#root` and takes over.

Env: `VITE_API_BASE`, `SITE_BASE_URL` (default `gulfcoastradar.com`),
`PRERENDER_LIMIT`.

---

## 11. The static surface — `public/` (24 files)

Not part of the React build. Nine are routed by `vercel.json` rewrites; the rest
are reachable by direct filename.

| File | KB | What it is |
|---|---|---|
| `book.html` | 35 | `/book/:slug/:app` — the universal booking form → `POST /api/platform/page/:slug/submit/:appId` |
| `biz.html` | 30 | `/p/:slug` — the modular public business page → `GET /api/platform/page/:slug` |
| `song-request.html` | 27 | `/:slug/profile` — the artist request/tip page |
| `menu-update.html` | 20 | the daily-menu page `gcr.js`'s `/entity/:slug/daily-update` serves (PIN via `x-menu-pin`) |
| `card.html` | 17 | NFC/business-card landing → `/api/gcr/nfc-card-lead` |
| `review.html` | 14 | review capture |
| `rides.html` | 14 | the transportation surface |
| `manage.html` | 10 | `/manage/:id` — customer self-service cancel/reschedule |
| `reviews-api.html` | 11 | `/developers/reviews` — public API docs |
| `booking.html` | 9 | an earlier booking page |
| `verified-review.html` | 7 | `/r/:slug` — the verified-review loop |
| `waiver.html` | 6 | `/waiver/:slug` → `/api/platform/waiver-sign/:slug` |
| `reviews-embed.js` | 7 | third-party review widget |
| `review-wall.html` | 5 | `/reviews/:slug` |
| `user.html` | 4 | `/u/:code` — referral/loyalty landing |
| `q.html` | 1.5 | QR shortlink |
| `embed.js` | 1.5 | the availability widget loader (paired with `/api/embed/*`) |
| **`qr-menu.html`** | **0** | **empty file** |
| assets | | `gcr-logo.png` (385 KB), `favicon.svg`, `icons.svg`, `manifest.json`, `gcr.vcf` |

This is the front end for `platform.js`, which the API blueprint describes as
*"the MODERN universal booking + module engine"* backing *"the gcr-unified
public pages (biz.html / book.html / manage.html)."* It is a real, live product
surface with **no build step, no linting, no tests and no mention in any
README**.

---

## 12. Root one-off scripts (16 files, 1,284 lines)

Database dump/export/import/convert tools and Playwright-ish verifiers, all at
the repo root rather than in `scripts/`:

`dump-entire-db`, `export-supabase-complete` (235), `export-complete-all-data`,
`extract-all-businesses`, `convert-sql-to-json`, `convert-db-to-organized-json`,
`import-from-backup`, `import-restaurants`, `insert-restaurants-from-backup`,
`add-ob-gs-restaurants`, `verify-app`, `verify-gcr`, `verify-live`,
`verify-navigation`, `inspect-page`, `debug-error`.

Five reference the production Supabase project directly. **Two contain a
committed `service_role` key — §16.1.** They are the reason `pg` is a runtime
dependency.

---

## 13. External connection map

| Service | How |
|---|---|
| **gcr-api-clean** | 101 paths across 22 routers, via bare `fetch` in ~40 files |
| Supabase Storage | **direct** — `Landing.jsx:29` hardcodes `…/storage/v1/object/public/entity-photos` and builds photo URLs from it |
| Supabase Auth | **dead code only** (`supabaseAuth.js`, unimported) |
| Firebase Auth | **dead code only** (`firebaseAuth.js`, import commented out) |
| Device APIs | Geolocation (`locationService`), DeviceOrientation (`compassService`), camera (`ArCameraOverlay`), PWA install prompt |
| Everything else | transitively through the API |

---

## 14. Honesty ledger

**Read in full, line by line:** `App.jsx`, `config.js`, `main.jsx`,
`ErrorBoundary.jsx`, `utils/templateCategory.js`, `services/compassService.js`,
`index.html`, `vercel.json`, `package.json`, `.gitignore`, and the headers of
`scripts/prerender.mjs`.

**Read substantially (head + structure + full API extraction):**
`services/gcrApi.js` (first 150 of 680 in full, all 15 export signatures, and
every API call site), `context/AppContext.jsx` (first 50 in full — the identity
model — plus its full endpoint set), `categoryMap.js`,
`services/locationService.js`, `services/supabaseAuth.js`,
`services/firebaseAuth.js`.

**Characterized by route, size, API calls and opening comments — not read
line-by-line:** all 38 pages and all 35 components. Their 101 API paths were
extracted mechanically from source and are exact; the internal render logic of
the four giants (`BusinessDetail` 2,467, `Swipe` 1,583, `Landing` 915,
`Profile` 844) is **not** claimed as read. That is ~15,000 lines of JSX and the
largest remaining gap in this paper.

**Not read at all:** the 38 page stylesheets and 15 component stylesheets
(~13,000 lines of CSS); the 24 files in `public/` (characterized from name,
size and the `vercel.json` rewrite that serves them); the bodies of the 16 root
scripts past their credential/dependency signals.

**Verified rather than assumed:** the routes in `App.jsx` against the pages
that exist; the API path extraction against every `.js`/`.jsx` under `src/`;
the dead status of `supabaseAuth`/`firebaseAuth` by grepping every import; the
committed key by decoding its JWT payload locally (§16.1).

---

## 15. Findings — ordered by what they cost

### 16.1 A live `service_role` key is committed to this repository

**`dump-entire-db.mjs` and `export-supabase-complete.mjs` each contain a
hardcoded Supabase JWT.** Decoded locally, both are:

```
role: service_role
ref:  mkepugvdlktfsossumox      ← "cyber check", the production database
exp:  2094998401                ← 2036
iss:  supabase
```

`service_role` **bypasses row-level security entirely**. It is the same class of
key `gcr-api-clean/db.js` holds, and `gcr-api-clean/CLAUDE.md` states the rule
it breaks: *"only gcr-api-clean talks to the database. No dashboard holds a
Supabase key."*

**Scope, accurately:**

- ✅ **Not in the browser bundle.** Both files are at the repo root, outside
  `src/`, so Vite never bundles them. `grep` over `src/` finds no JWT.
- ❌ **In the git repository, and in history.** Last touched in commit
  `9641a78`. `.gitignore` does not cover `*.mjs`.
- ❌ **Long-lived.** Expires 2036; no rotation is implied by the file.

**Recommended, in order:** rotate the `service_role` key in the Supabase
dashboard; replace both literals with `process.env.SUPABASE_SERVICE_KEY` (the
pattern `Dashboards-users-/scripts/` already uses and documents); purge from
history if the repository has ever been public or shared; and add `*.mjs` at the
root to `.gitignore` or move all 16 scripts into an ignored directory.

This is the highest-severity finding across all four repos.

### 16.2 Three dead dependencies, one of them a Postgres driver

| Package | Why it is there | Reachable? |
|---|---|---|
| `pg` | the root DB scripts | **never from the browser** — a Node driver in `dependencies` |
| `@supabase/supabase-js` | `services/supabaseAuth.js` | **imported by nothing** |
| `firebase` | `services/firebaseAuth.js` | **import commented out** (`Auth.jsx:6`) |

All three inflate the install and, more importantly, keep two complete
alternative auth implementations alive on disk beside the one that runs. The
`SUPABASE_KEY` export in `config.js` exists solely to feed the dead one — it
defaults to `''`, so nothing leaks today, but a well-meaning
`VITE_SUPABASE_KEY` in a Vercel dashboard would put a real key into the public
bundle. **Delete `supabaseAuth.js`, `firebaseAuth.js`, the two config exports,
and move `pg` out of `dependencies`.**

### 16.3 The tourist site calls four admin endpoints

`Swipe.jsx` calls `/api/admin/sms-config`; `services/gcrApi.js` calls
`/api/admin/tripswipe/{settings,sponsored,promo-cards}`.

Every one of those is `adminRequired` in `gcr-api-clean/routes/admin.js` and
`admin-settings.js`. From a signed-out tourist browser they can only 401/403 —
and because `AppContext`'s helpers return `null` on any failure, **the deck
silently renders without sponsored placements or promo cards rather than
reporting anything.** Sponsored inventory is revenue; failing silently is the
wrong failure.

The fix is on the API side: a public, read-only projection of sponsored/promo
data (the pattern `mcp-public.js` already uses). Until then the calls are
guaranteed-dead weight on every deck load.

### 16.4 No shared HTTP client and no endpoint registry

Both sibling dashboards centralise this and say why. Here, ~40 files call
`fetch` directly, `API_BASE` is re-derived from `import.meta.env` in at least
four files (`App.jsx:123`, `Dashboard.jsx:7`, `Deals.jsx`, and `config.js`), and
there is no shared timeout, no typed error, and no single place to change a
path.

The concrete consequence is already visible: `AppContext`'s helpers return
`null` for *every* failure — 401, 404, 500 and network alike — so no caller can
tell "you have no saves" from "the request failed." `Admin-dashboard-main`
distinguishes those three cases explicitly and built its whole
honest-about-gaps behaviour on top of it.

### 16.5 One error boundary for the whole app

`ErrorBoundary` wraps `<BrowserRouter>`. Any render error in any of 38 pages
blanks the entire site to *"Something went wrong / Reload."*
`Admin-dashboard-main` wraps **each section** so *"one section throwing must not
blank the whole dashboard."* Given `BusinessDetail` is 2,467 lines rendering a
payload assembled from ~90 tables, per-route boundaries would pay for
themselves.

### 16.6 `Dashboard.jsx` — 434 unreachable lines on the legacy API

Not routed in `App.jsx`, so nothing can navigate to it. It is also the only
consumer of `/api/dashboard/*`, the `site_id`-keyed legacy router that
`Dashboards-users-` exists to replace. Either route it, or delete it — an
unroutable page that still ships in the bundle and pins a legacy dependency is
the worst of both.

### 16.7 The static surface has no owner

24 files in `public/`, nine of them load-bearing production URLs wired by
`vercel.json`, carrying the entire consumer face of the universal booking
engine — with no build step, no lint, no test, and no documentation anywhere in
this repo. `qr-menu.html` is **0 bytes** and would serve a blank page if
anything links to it.

### 16.8 `README.md` is the stock Vite template

50 lines about `@vitejs/plugin-react` and the React Compiler. Not one word about
Gulf Coast Radar, the routes, the API, the static surface, or how to run it
against a local API. The largest and most user-facing repo in the platform is
the only one with no documentation at all — this file is the first attempt at
any.

### 16.9 Smaller notes

- **`categoryMap.js` ↔ `gcr-api-clean/utils/listing-category-map.js` is a
  declared mirror.** `hydrateTaxonomy()` mitigates drift at runtime but does not
  remove it: the static map is still what renders the first paint.
- **Two category systems on every card** (`category`, 5 buckets; `section`,
  9 buckets), documented as deliberate but a standing trap for new code.
- **`Landing.jsx:29` hardcodes the Supabase storage host**, bypassing
  `gcrApi.fixUrl` and `config.js`. It is a public bucket so nothing leaks, but
  it is the one place a storage URL is built outside the normaliser that
  *"every image src anywhere in the app should pass through."*
- **No `.env.example`**, unlike all three sibling repos — so the seven
  `VITE_*` variables this app reads are discoverable only by grep.

---

## 17. What this repo is, in one paragraph

`gcr-unified` is the consumer product: the public Gulf Coast directory, the
Trip Swipe deck, the tourist account, and every booking flow a visitor touches
— 53 React routes over 101 API paths, plus nine more URLs served straight from
static HTML that never reach React at all. Its best ideas are real and load
bearing: a guest identity minted on first visit so a signed-out swipe is still
recorded and merged on signup, a taxonomy hydrated from the API at boot so a new
subtype needs no deploy, a URL-keyed response cache standing in for the router
cache it doesn't have, a postbuild prerenderer giving 4,000 businesses a real
static page for crawlers, and the floating concierge already pointed at the
modern tool layer the legacy chatbots still aren't. It is also the least tended
of the four: no endpoint registry, no shared HTTP client, one error boundary for
thirty-eight pages, three generations of auth on disk with two of them dead, a
2,467-line detail page, a stock Vite README — and a production `service_role`
key committed at the repo root, which is the one thing on this list that should
be fixed today.

---

*Companion papers: `gcr-api-clean` (the API spine, §0–11 + Appendices A–S, plus
`docs/BLUEPRINT_VERIFICATION.md`); `Admin-dashboard-main/docs/BLUEPRINT.md`;
`Dashboards-users-/docs/BLUEPRINT.md`. Next: the four-repo interconnection map.*
