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

**Correction from the every-line pass:** the static surface calls the API too, and not always successfully — `song-request.html` reaches `/api/cooperatives`, while `rides.html` and `review.html` call routes that do not exist. See Appendix F.

---

# EVERY-LINE PASS — Appendices

Reading the actual page and component code, not just routes and endpoints. The
reasoning in this codebase lives in its inline comments, and this pass reads
them.

## APPENDIX A — `BusinessDetail.jsx` (2,467 lines) — the largest file on the platform

`/business/:slug`. Renders everything `buildFullEntity` assembles. Read in full.

**The industry-first ordering rule (L96)** is the file's organising idea, and
the comment is careful about *how* it is applied:

> The DOM order of content sections follows the industry tab order (rank map
> filled during render). **Applied directly as each section's own
> `style={{ order }}` in JSX — not as a post-paint DOM mutation** — so it's never
> dependent on ref-collection timing, object key insertion order, or guessing the
> flex parent from an arbitrary child.

**`TAB_PRIORITY` (L536–546)** encodes what each industry's visitors came for:
food → menu & specials · activities → trips & pricing · stays → rooms &
amenities · services → service list · shops → products · parks → park info.
Tabs not named keep their relative order after the prioritised ones. The stated
model is *"Yelp-style top-down flow: lead with what the visitor came for, put the
'about' overview right after it (not buried at the bottom), then the supporting
detail, social proof (reviews), photos, and finally the logistics."*

**The default tab (L145)** follows the same rule per entity: *"a hotel opens on
Rooms, a shop on Products, a service on Services, a park on Park Info. A
restaurant opens on its MENU even when it also has offerings — **the industry's
primary content wins over generic booking content.**"*

**Click attribution — two functions, deliberately (L43, L60).** `trackAndOpen`
logs an outbound booking/order click and opens the destination with a `gcr_ref`
so the conversion attributes back. `trackAndNavigate` is *"the same click
attribution, but for internal GCR pages (e.g. the Reserve flow) — navigates
in-app instead of opening a new tab, **so we know this session came specifically
from the booking CTA, not a generic page visit.**"*

**A bug ledger in the comments**, each entry naming the symptom it fixed:

- **L188 / L658 — dead photo URLs.** The carousel steps over photos whose URL
  failed to load: *"without this the carousel parks on a blank fallback tile every
  time it cycles onto one, which reads as 'images aren't loading' even when most
  of them are fine."* If the dead photo is the one on screen, it moves off
  immediately rather than showing a blank tile until the next tick.
- **L203 — the sticky-header measurement.** A `ResizeObserver` on
  `.detail-header` so `.sticky-tabs` can stack beneath it. It depends on
  `business` rather than `[]` because *"`.detail-header` doesn't exist in the DOM
  yet during the initial mount — this component early-returns a loading
  placeholder until `business` resolves, so the ref is still null on a mount-only
  effect."*
- **L924** — section scrolling used *"a flat −130 that ignored the real
  (ResizeObserver-measured) header height, so section tops could land partially
  behind the sticky header/tabs bars."*
- **L371** — `entity_specials` rows use `special_name`/`discount_*` where menu
  items use `item_name`/`price`; without the fallback *"every special rendered
  through this shared renderer showed a blank name and no discount."*
- **L383** — `image_url` is returned flat; `item.images[]` was *"the old shape,
  never matched."*
- **L1395** — `price_label` sometimes carries a raw internal unit token
  (`flat`, `person`, `trip`) rather than a price string. Those *"only ever make
  sense appended to a dollar amount, never shown alone […] **no badge beats a fake
  one.**"*

**Two suppression rules that prevent duplicate content:**

- **L307 — flat pricing vs rich sections.** Rich offerings come from real
  `entity_sections` (uuid ids) and already group their priced items; offerings
  synthesised from the `offerings`/marina tables use negative numeric ids. When a
  business has rich sections, the separate flat `pricing_items` list is a
  redundant duplicate — *"e.g. Coyote's 6 rental sections vs its 11 identical
  pricing_items"* — so it is suppressed. **A business whose only structured
  pricing IS the flat list keeps it.**
- **L268 — leaked subtypes.** Raw `entity_subtype` values that ended up in
  `entity_tags` *"belong on the backend for filtering, not displayed as
  human-readable chips."* `GOOGLE_TYPE_NOISE` (L264) and `GOOGLE_TYPE_CATS`
  (L279) do the same for the raw Google Places taxonomy.

**Meal-period grouping (L338, L575, L1848).** `MEAL_ORDER` is
Breakfast → Brunch → Lunch → Dinner → Late Night → All Day. Sub-section chips
use period dividers for menus and plain section names for drinks/happy-hour
*"since they don't have period grouping."* Section labels drop the period prefix
when the period chip already shows it — *"'Lunch Desserts' → 'Desserts' under 🥗
Lunch."*

Also: an `IntersectionObserver` highlighting the active sub-section chip on
scroll (L223); two-level amenities — the unit's own plus the complex's (L460);
related-profile rails for same-parent businesses (L104); `GALLERY_PER_PAGE` /
`REVIEWS_PER_PAGE` at 10; a 220-char description clamp (L757); and a shared
cache entry with `fetchBusinessBySlug` so *"if this business was already fetched
anywhere else (a card preview, etc.) this returns instantly with no network round
trip."*

## APPENDIX B — `Swipe.jsx` (1,583 lines) — the deck

`/swipe/:category`. Five card types, a resumable queue, and a live-learning
ranking loop. Read in full.

### The five cards

`BusinessCard` (L1161) · `SocialCard` (L1099, IG Reels and FB video injected
into the deck) · `PromoCard` (L1336) · `DealSwipeCard` (L1390, with
`DEAL_COLORS`) · `EventSwipeCard` (L1497) — *"live music/concerts, events
tonight, happy hours right now, and daily specials — **one card, four looks**
(`KIND_STYLE`), so they all reuse the same business-card/deal-swipe-card CSS."*

Those event cards come from `fetchHomeFeed` — *"the same source the Home page's
slide rows use, reshaped into swipeable cards"* — with synthetic ids that
`resolveReal()` deliberately does not remap, so swiping right saves the card
object itself.

### The fetch-size bug, diagnosed in the file (L377)

> `fetchBusinesses()` defaults to `limit:50` — fine for a quick preview list
> elsewhere, but the swipe deck is the ONE place meant to draw from the platform's
> real full catalog (270+ restaurants alone, before nightlife/shopping/
> activities/stay). At the old default, every swipe session — no matter how much
> you swiped or how many times you reloaded — only ever pulled the same first 50
> entities the API happened to return, split five ways across category tabs.
> **That's the real cause of "same ~25 cards over and over no matter what" — a
> fetch-size bug, not a shuffle bug** (`shuffle()` itself is a correct
> Fisher-Yates).

### The resumable deck

`SWIPE_QUEUE_PREFIX = 'gcr_swipe_queue_'`, `DECK_SIZE = 15`. Per-category
*"where they left off"* — **ids only**, *"looked up against freshly-fetched
businesses on restore so the data itself never goes stale"* (L272). On return it
restores whichever queued cards are still unseen, in the same order so the last
item stays on top, then fills remaining capacity with fresh personalised cards
added to the front (L471).

**Guests get a fresh deck deliberately** — *"don't filter by `seenSlugs` so the
first 15 cards always show regardless of prior localStorage state"* (L462).

### The refill loop, and the bug it fixed (L576)

> Allow the same business (slug) to appear multiple times in the INITIAL deck
> (once per exploded photo-card) — but not once its slug has actually been swiped.
> Without the `seenSlugs` check, once the real unseen supply in `pool` ran low this
> refilled from already-decided cards forever: `cards.length` never reached 0, so
> `allGone` (which requires exactly that) never fired and **the deck looped through
> repeats instead of ever reaching "You've seen them all!"**

### Live personalisation (L595, L612)

Every 10 swipes it re-fetches preference scores and re-sorts **the remaining
pool, not the visible deck** — *"that would yank cards out from under the user and
reset `likedCount`"* — so cards pulled in from then on reflect patterns from *this
session*. A small delay first, because *"the swipe batch itself flushes to the
backend on its own timer (see AppContext's `flushSwipes`), which is what actually
updates the preference scores we're about to re-fetch."*

### Four actions, not two

`pressLike` · `pressNope` · **`pressMaybe`** (L707) — *"'Not sure yet' — distinct
from Pass (rejected) and Like (want to go). Mild positive signal for preference
scoring (see `SWIPE_WEIGHTS.maybe` on the backend), doesn't save the place, but is
undo-able"* — and **`pressUndo`** (L718), which is *"best-effort: pull the swipe
back out of the not-yet-sent queue so an undone action doesn't still get counted
toward preference scoring."*

**The heart button is separate from the gesture** (L644, L654): quick
save/unsave that doesn't dismiss the card — but it still records the same
preference and seen signal, because *"a heart-save is just as real an endorsement
as swiping right, it just doesn't dismiss the card, so it shouldn't be invisible
to the algorithm that's supposed to be learning from likes."*

**A one-time discovery hint** (L308, L417): Maybe and Undo float quietly in the
card corners — *"that's deliberately subtle, but a first-time visitor has no way
to discover them on their own."* Shown once per device, dismissed on first
interaction or after a few seconds.

### Category routing (L329, L337)

`CAT_TABS` (from `src/data/catTabs.js`, shared with Search) is now the real
section list. `/swipe/events` and `/swipe/drinks` are not real sections and are
redirected — drinks to Nightlife, *"the closest real section"* — and the comment
notes `/swipe/restaurants` **is** real now and is deliberately no longer
redirected.

Also: a trip-context "Change" modal for dates and group type, with destination
deliberately not editable *"the app is Orange Beach/Gulf Shores only today"*
(L318); `PropertyAutocomplete` reusing Setup's live property search (L156); and
`SMS_SIGNUP_LINK` texting `SWIPE` rather than `BEACH` *"just tells the inbound
webhook this signup came from the swipe-deck prompt"* (L116).

## APPENDIX C — `Landing.jsx` (915) and `Profile.jsx` (844)

### `Landing.jsx` — the homepage, `data-shell="navy"`

Nine card components, each a distinct layout: `BizCard` (tall, full-bleed photo),
`MiniCard`, `HHCard`, `MusicCard`, `ActivityCard`, `EmptyCard`, plus `Rail`,
`SectionHead`, and a full **`MasterCalendar`** (L312–482) with `CalSection` and
`CalRow`.

**`dedupeByName` (L12)** guards the same problem `CategoryPage` does: *"a
business scraped from more than one source can end up as multiple entity rows
with slightly different name strings. Without this, the homepage rails could
feature the same business twice among only ~10-12 slots."* The row whose slug
has no hash suffix wins.

**`CATEGORIES` (L52)** carries a placement note: AR Hunt was moved up from
last-of-nine because *"the category rail only shows ~2-3 cards before needing a
scroll on a phone-width viewport, so at the end it was effectively invisible — no
other nav entry links to `/ar-hunts` at all."*

`imgUrl` (L67) reconstructs a Supabase storage URL from a broken
`/photos/slug/file.jpg` path — the hardcoded host noted in §16.9. `WX_ICON` /
`WX_LABEL` map weather codes; `HERO_IMG` is a hotlinked Unsplash URL.

### `Profile.jsx` — the account hub

The widest API fan-out of any page: `/api/tourist/{profile,points,photos,reviews,
groups,upload-media}`, `/api/tourist-auth/{add-email,verify-add-email}`, and five
`/api/platform/*` routes (`my-bookings`, `rewards/:slug`, `redeem`, `my-share`,
`my/videos`).

**`compressImage` (L10)** downscales to max 1200px wide at 0.8 JPEG quality
before upload *"so we're not shipping multi-MB originals into the photos table"* —
images become a JPEG blob, videos upload as-is. Also `hasRealEmail` (phone-only
accounts carry a derived address), `formatPhone`, `daysBetween`, and
`copyShareLink` for the referral code.

## APPENDIX D — the remaining 34 pages

**Discovery.** `CategoryPage` (256, serves nine routes) and `CategoryListings`
(257) share three deliberately identical rules, *"kept identical so the two pages
agree on which of a duplicate pair wins"*: hub children are excluded because
*"a marina's individual charter boats […] are meant to be found by drilling into
their parent hub, not as their own standalone card"*; duplicates dedupe on name
preferring a proper subtype and no hash slug; and filter chips dedupe on a
normalised key so *"'1950s themed' / '1950s-themed' become a single chip."*
`CategoryPage` also uses solid CSS gradients rather than hotlinked photos,
because *"the previous Unsplash URLs had no fallback, so a single blocked/dead
link showed as a blank gray hero banner across every category."*

`Search` (769) runs two searches with different debounces — a fast autocomplete
*"so they don't have to finish (or correctly spell) the query by hand"* and the
full keyword search — plus date search over `/api/gcr/availability-search` with
six vertical filters. Saved availability searches are device-local, *"a
cross-device table is specced in the API's migration file."*

`Events` (408) sorts *"playing now / starting soon today first, later dates
pushed to the bottom"* — and notes that *"previously this list had no sort at all
and just rendered in API order."* Today-but-already-ended (assumed 3-hour window)
drops out of the top group. `Deals` (713) has its own header block naming every
source and where deals resurface. `LiveFeed` (152), `Browse` (67), `ArHunts`
(263, with per-hunt admin-settable capture radius and a live location watcher).

**Verticals.** `RentalListings` (378) → `RentalDetail` (537) → `BookRental`
(199); `ServiceListings` (231) → `ServiceDetail` (455) → `BookService` (159).
`ServiceListings` derives its fetch filter from `SERVICE_TABS` — *"single source
of truth for which subtypes count as a 'service' […] so the fetch filter can never
drift out of sync with the tab bar again"* — and its booking badge *"reflects
where THIS business actually takes bookings — derived from its real
`booking_url`, never assumed from the business type."*

**`Reserve` (396)** is the richest flow and reads as a specification of the
booking policy: a fallback 30-minute dinner grid used *"whenever a business
hasn't set up (or synced from FareHarbor/Peak/Airbnb) real per-slot capacity"*,
with real slots always taking priority; an **opt-in gate captured before the rest
of the flow** *"so the business has a name + phone on file even if the customer
abandons checkout, and so SMS only ever goes to numbers with explicit consent
(required until A2P 10DLC approval is in place)"*; a clickwrap waiver shown only
when `waiver_required` is on; and a transportation add-on available on **any**
booking, *"not just pickup/delivery businesses […] GCR brokers this out via SMS
dispatch, separate from the reservation itself."*

**Account.** `Auth` (538) is the most detailed: **WebOTP** auto-fills the code
straight from the incoming SMS (*"Android Chrome only; other browsers fall back to
`autoComplete="one-time-code"`"*), auto-submits the instant six digits are
present, treats keyboard-suggestion autofill as a paste, and pre-fills the phone
from `?phone=`. It also records a **deliberate dead-end**: the tap-to-sign-in
magic link is disabled — *"every account/session must come through the Twilio
Verify phone flow […] this page just no longer calls out to it, so a stray
`?token=` in the URL does nothing instead of creating a session."* The backend
route and SMS webhook are untouched.

`Setup` (313) filters out the destination question *"app is Alabama Gulf Coast
only"*. `Saves` (114) reads through `AppContext` rather than its own fetch —
*"this used to be a second, disconnected copy of 'my saved places' […] so removing
or adding a save on one screen wouldn't show up on the other."* `Building` (127)
falls back to a local plan from saves when signed out. `Groups` (187), `Group`
(172), `Invite` (94), `Itinerary` (168), `MyList` (107), `Reset` (94),
`ReviewUpload` (123), `Home` (339), `Confirmation` (115), `Privacy` (52),
`Terms` (50), `NotFound` (18).

**Artist + menu.** `ArtistLive` (231) — *"standalone live-artist page
(headerless, QR/link-tree style) […] shows the live-show money layer instead of
the directory/booking layer. **Every section is gated on real data — nothing
renders unless the artist actually has it filled in, and every action writes to a
real endpoint (no demo/fake sections).**"* `ArtistProfile` (326),
`ArtistListings` (123), `RestaurantMenu` (249), `LinksPage` (211).

**`LinksPage` carries the module-gating rule** (L79): a business can turn a
module off even while still collecting its data, and *"default to shown when
there's no `entity_modules` row for that key at all — most of the ~2,900 entities
don't have every module configured yet, and **'no record' should never mean
'hidden.'** Only an explicit `enabled:false` hides it."* Its key names match the
App Store module keys.

## APPENDIX E — the 35 components

**`GCRCard.jsx` (470)** — the universal card. Tags are *"fully dynamic: display
whatever is in the DB, use `tag_category` from API"*, skipping the raw Google
Places taxonomy and *"any label that's still a machine slug (snake_case like
`point_of_interest`, or camelCase like `wheelchairAccessibleParking`)."* Its
things-to-do test reads from `categoryMap.js` deliberately — *"a separately
maintained list here drifts out of sync as new subtypes get added there."*
Routing is explicit: *"All entity table records go to `/business/:slug` […]
`/rental/:slug` and `/service/:slug` are for `bookable_resources` (separate
booking system)."* Its no-photo placeholder is **CSS-only with no network
dependency**, because *"a remote fallback image can itself go dead."*

**`ArCameraOverlay.jsx` (203)** — the most device-specific code in the repo, and
honest about its limits: `ASSUMED_FOV` is *"a reasonable average […] this isn't
true 3D-anchored AR, just a heading-driven overlay."* iOS 13+ needs the
permission call *"directly inside a user-gesture handler […] no awaited work
before it, or the browser silently treats it as not user-initiated and denies
it."* It prefers `deviceorientationabsolute` and falls back to
`deviceorientation`; if no heading arrives in time it degrades *"to a centered
marker driven by distance alone rather than leaving it stuck loading."* The video
stream attaches in its own effect because *"the `<video>` element only exists once
`permissionState` is 'granted'."*

**`ClaimBusiness.jsx` (193)** — on every profile page, and the comment states the
whole point: *"The button already knows which listing the visitor is looking at,
so the claim carries the slug. That is the whole point: an admin opening the lead
sees the business it is about instead of matching a typed name back to one of four
thousand listings."* Submitting grants nothing — it writes a `business_claims`
row with status `new`. `role` rides in the note because *"role isn't a column on
`business_claims`."* It uses its own overlay classes rather than the page's
`.modal-overlay`, *"which is `display:none` until an `.open` class is added.
Self-contained means this component drops onto any page."*

**`AvailabilityCalendar.jsx` (194)** — two modes: `select` (range picker with a
live quote) and `view` (read-only blocked nights). *"Any blocked night strictly
between two dates makes the range invalid."*
**`BookingCalendar.jsx` (162)** resets everything when the slug changes —
*"previously nothing here depended on slug at all, so a previously-picked date,
guest count, and availability from one business carried straight into a different
business's booking form."*

**`SectionRenderer.jsx` (163)** maps `entity_sections.layout` to a render style,
*"falls back to 'grid' for unset/unknown values so nothing breaks if a section was
created before layout existed."* **`IndustryFacts.jsx` (109)** renders the
industry table row the API resolves through `industry_table_contract` —
*"generic on purpose: **any column added to an industry table shows up here with
no frontend change.**"* **`PoliciesSection.jsx` (67)** shows both real
`entity_policies` rows and FAQs whose category matches a policy type, *"so both
sources show even if only one has data."*

**`ReviewsSection.jsx` (253)** resets to page 1 on business change, posts
authentic reviews tied to the phone account (*"name/email come from the account —
no anonymous typing"*), and falls back to the business's aggregate rating when
there are no on-platform reviews yet.

**`InstallBanner.jsx` (183)** shrinks to a tappable icon after a few seconds
*"so it stops competing with the 'Ask a local' FAB"*, and sits above it rather
than overlapping. **`AiChat.jsx` (203)** grabs location best-effort — *"never
blocks the chat — resolves null on denial/timeout"* — and posts to
`/api/tourist/ai-chat`, the modern concierge. Plus `HubTemplate` (219),
`GallerySection` (127), `GCRHeader` (114), `BlogSection` (102), `EntityCard`
(98), `LocationPicker` (133), `TeamSection` (61), `BottomNav` (52),
`SkeletonLoader` (40), `PageHeader` (37), `Toast` (25).

## APPENDIX F — the static surface (`public/`, 24 files), read

Nine are live production URLs via `vercel.json`; the rest are reachable by
filename. **This pass found three broken ones and corrected one earlier claim.**

| File | KB | Serves | Calls |
|---|---:|---|---|
| `book.html` | 34 | `/book/:slug/:app` | `/api/platform/page/:slug`, `/api/stripe/config`, `/api/stripe/create-payment-intent` |
| `biz.html` | 29 | `/p/:slug` | `/api/platform/page/:slug` |
| `song-request.html` | 26 | `/:slug/profile` | `/api/artists/:slug`, `/queue`, `/request`, **`/api/cooperatives/:slug/cooperatives`**, `/contribute` |
| `menu-update.html` | 19 | direct | `/api/gcr` (daily-update, PIN via `x-menu-pin`) |
| `card.html` | 16 | direct | `/api/gcr/nfc-card-lead` |
| `review.html` | 13 | direct | **`/api/reviews/request`, `/api/reviews/submit` — neither exists** |
| `rides.html` | 13 | direct | **`/api/rides/request` — router is commented out** |
| `manage.html` | 10 | `/manage/:id` | `/api/platform/manage/:id`, `/page/` |
| `reviews-api.html` | 10 | `/developers/reviews` | docs for `/api/platform/reviews/` |
| `booking.html` | 9 | direct | — (an earlier booking page) |
| `verified-review.html` | 6 | `/r/:slug` | `/api/platform/review-token/`, `/reviews` |
| `waiver.html` | 5 | `/waiver/:slug` | `/api/platform/waiver-info/`, `/waiver-sign/` |
| `review-wall.html` | 4 | `/reviews/:slug` | `/api/platform/reviews/` |
| `user.html` | 3 | `/u/:code` | `/api/platform/u/:code` |
| `q.html` | 1.5 | direct | `/api/qr/scan/` |
| `qr-menu.html` | **0** | — | **empty file** |
| `embed.js` · `reviews-embed.js` | 1.5 · 7 | third-party sites | the availability + review widgets |

### ⚠ `rides.html` posts to a route that is commented out

`POST /api/rides/request`. `server.js:336` — *"UNMOUNTED: backing tables don't
exist in the live DB, and this used the legacy `site_id` convention. Superseded
by `/api/transportation`."* The live replacement is
`POST /api/transportation/request`, which `TransportationRequest.jsx` and
`Reserve.jsx` both already use. **This page is dead and cannot work.**

### ⚠ `review.html` hits the exact shadowed-route hazard the admin console refuses to reproduce

It calls `GET /api/reviews/request/<token>` and `POST /api/reviews/submit`.
`routes/reviews.js` has only `GET /:slug`, `GET /:slug/stats`,
`POST /:slug` (ownerRequired), `PUT /:slug/:id`, `DELETE /:slug/:id`.

- `GET /api/reviews/request/<token>` → no match → 404.
- **`POST /api/reviews/submit` → matches `POST /api/reviews/:slug` with
  `slug = "submit"`.** It does not 404. `ownerRequired` is what stops it — an
  unauthenticated visitor gets 401 rather than a review filed against a business
  named "submit."

`Admin-dashboard-main/src/modules/menu/Reviews.jsx` documents this precise trap
and **refuses to reproduce the legacy flow**; `scripts/audit-endpoints.mjs` was
written to catch it. It is live here, in a page no audit covers.

### ✅ Correction — the crowdfunding economy *does* have a fan surface

The main paper (and backlog item 21) recorded `/api/cooperatives` and
`/api/goals` as having no fan-facing surface. **Half of that is wrong.**

`song-request.html` — served at the live URL `/:slug/profile` — calls
`GET /api/cooperatives/:slug/cooperatives` and
`POST /api/cooperatives/:slug/cooperatives/:id/contribute`, matching
`cooperatives.js:71` and `:150` exactly.

**`/api/goals` remains genuinely unreachable** — `grep` over both `src/` and
`public/` finds no caller for it anywhere. So the correct statement is: song
crowdfunding is wired through the static surface; artist *goals* are not wired at
all.

This is the clearest argument in the paper for §16.7 — a live product surface
outside the React app, outside every audit, holding both a working feature nobody
had counted and two broken pages nobody had noticed.

## APPENDIX H — the 52 stylesheets (15,451 lines), read

Skipped in the first pass on the grounds that it was "presentation only." That
was wrong twice over: this CSS encodes real layout contracts, and reading it
found the single worst structural defect in the repo.

### H.1 ⚠ Six files define `:root`, and eight global tokens collide

`index.css` defines the token layer. **Five other stylesheets also open
`:root`**, and three of them redefine tokens `index.css` already owns — at
identical specificity, so **whichever stylesheet the bundler emits last wins for
the entire application.**

| Token | `index.css` | overridden by | consumers |
|---|---|---|---:|
| **`--accent`** | `#0b7a75` teal | `BusinessDetail.css` → **`#e85d04` orange** | **36** |
| `--border` | `#e2e8f0` | `BusinessDetail.css` → `#e6ecf3` | **72** |
| `--text` | `#1a2433` | `GCRCard.css` → `#12263a` · `Browse.css` → `#1a2332` | 27 |
| `--muted` | — | `GCRCard.css` `#66788a` vs `BusinessDetail.css` `#5c6b81` | 38 |
| `--ink` | `#1a2433` | `BusinessDetail.css` → `#0e1726` | 15 |
| `--card` | `#ffffff` | `BusinessDetail.css` → `#fff` | 21 |
| `--shadow` | — | three different values in `GCRCard` / `Browse` / `BusinessDetail` | 7 |
| `--radius` | `20px` | `GCRCard.css` → `18px` | 1 |

**This is live, not theoretical.** `App.jsx` imports every page statically — there
is no lazy loading in this app — so every page stylesheet is always in the bundle
and always loads after `index.css`. In a production build **`--accent` resolves to
orange `#e85d04` application-wide.**

Seven files outside `BusinessDetail.css` consume it: `BottomNav.css` (the active
nav item), `Home.css`, `Profile.css`, `Swipe.css`, `MyList.css`,
`Itinerary.css`, `Building.css`.

Two of those are the tell. `Home.css:28` and `Profile.css:6` both write:

```css
background: linear-gradient(135deg, var(--primary), var(--accent));
```

`index.css` sets `--primary` and `--accent` to the *same* teal, which would make
that gradient flat — so whoever wrote it expected two colours. Under the real
cascade it renders **teal → orange**. Whichever was intended, the fact is that
the app's accent colour is decided by stylesheet emission order rather than by
the token file.

**The fix is a scope change, not a colour change:** page-specific palettes belong
on a page class (`.business-detail { --accent: … }`), not on `:root`.

### H.2 The token system barely exists

| | raw hex | `var(--…)` | ratio |
|---|---:|---:|---|
| `gcr-unified` | **1,617** | 673 | **71% hardcoded** |
| `Admin-dashboard-main` | 36 outside `theme.css` | — | ~5% |
| `Dashboards-users-` | **0** outside `:root` | — | **0%** |

Reading all three repos' CSS confirms the same split the JavaScript read found.
`Dashboards-users-` has 45 tokens and **not one raw hex outside `:root`**.
`Admin-dashboard-main` has 72 tokens in `styles/theme.css`, **no colliding
`:root` blocks at all**, and one `!important` in 3,139 lines. `gcr-unified` has
six competing `:root` blocks and 1,617 hardcoded colours.

**And no dark theme.** No `prefers-color-scheme`, no `data-theme`, anywhere in
15,451 lines. Both dashboards support both themes through the same three-tier
pattern; the front end tourists actually use is light-only. With 71% of colour
hardcoded, that is not a small change — it is the concrete cost of H.2.

### H.3 `z-index` has no scale

Ten separate rules sit at `z-index: 1000` — `GCRHeader` (the fixed header),
`AiChat`'s FAB and panel, `LocationPicker`'s dropdown, `MiniSiteComponents`,
`RestaurantMenu`, `RentalDetail`. When ten things share a level, **DOM order
decides**, which is why the stacking bugs the comments record keep recurring.

Above them: `Toast` 9999 · `ClaimBusiness` 2100 · `ArCameraOverlay` 2000 ·
`GCRHeader`'s dropdown 2000 · `MiniSiteComponents` 1001.

### H.4 The fixed-chrome offset is copy-pasted into seven files

Six stylesheets carry a near-identical comment:

> Clears BottomNav + the "Ask a local" FAB + the install banner, which stack
> above it at up to ~200px from the viewport bottom (see InstallBanner.jsx /
> AiChat.css) — without this the last card is hidden behind them.

`BusinessDetail.css`, `CategoryListings.css`, `CategoryPage.css`, `Events.css`,
`LiveFeed.css`, `RestaurantMenu.css`, `Search.css`. `Deals.css` has its own
variant pushing the FAB up *"specifically on this page rather than changing its
position app-wide."*

Move the FAB and seven stylesheets need editing. `--max-w` and `--gcr-header-h`
prove the pattern is already understood here — the bottom stack just never got
its own variable.

### H.5 What the CSS gets right, and documents

Sixty substantive comments, each recording a real fix:

**`index.css`** is the strongest file in the repo. It explains
`-webkit-text-size-adjust` (*"WebKit/Blink can auto-boost font sizes in narrow
flex columns […] every font-size in this app is an intentional px value"*); why
`--max-w` is `100%` on phones (*"a hardcoded 430px left a sliver of background
down both sides of a 440pt iPhone Pro Max"*); why `overflow-x` sits on `body` as
well (*"fixed-position elements aren't contained by `#root`'s clip"*); and —
the best comment in any of the four repos — **why it is `clip` and not `hidden`**:

> `overflow-x:hidden` forces the browser to also treat `overflow-y` as auto (per
> the CSS overflow spec, a non-visible value on one axis converts a visible value
> on the other to auto), which quietly turns `#root` into a scroll container that
> never actually scrolls — **breaking `position:sticky` for every descendant in the
> app**, since sticky elements then anchor to `#root`'s frozen scrollport.

**`Swipe.css`** documents its interaction with `react-tinder-card`: the library
*"only ever sets an inline `transform` for the drag gesture — it never touches
top/left/width/height/bottom, so pinning all four sides here doesn't conflict with
it."* It uses `svh` rather than `dvh` because *"this page has no scrollable
content to ever trigger the browser chrome to collapse, and `dvh` can resolve
larger than what's actually visible […] leaving a permanent dead gap."* It records
a skeleton loader that *"referenced a `shimmer` keyframe that was never defined
anywhere, so the loading card just sat static."* And it states the theme
exception plainly: this page is black by design, so *"`var(--text)`/`rgba(0,0,0,…)`
were tuned for a light page and would be invisible here."* At L637 it notes using
compound selectors *"(not `!important`)"* to win a cascade fight — deliberate
restraint.

**`BusinessDetail.css`** documents the three-deep sticky stack — global header,
then `.detail-header`, then `.sticky-tabs` — and why both offsets are needed:
*"using only `--detail-header-h` parked these ~48px from the top, i.e. behind the
global header, so the tab row vanished under it while scrolling."*

**`BottomNav.css`** records a real accessibility fix: it *"used to be hidden at
≥769px, which left tablet and desktop visitors with no way to reach
Home/Search/Saves/Profile at all — the header has no equivalent."*

**`AiChat.css`** hugs the right edge of the *centred app column* rather than the
window, because *"on a tablet/desktop the window is wider than the column, so a
flat `right:18px` left this floating out in the empty side margin."*

**`ClaimBusiness.css`** is fully self-contained by design — every class prefixed
`claim-`, its own overlay rather than the page's `.modal-overlay` — so *"dropping
`<ClaimBusiness />` on a new page needs no other stylesheet."*

### H.6 Dead CSS

**133 of 1,842 classes (7%) are never referenced** in any `.jsx`, `.js`,
`public/*.html`, or `index.html`. Examples: `artist-profile-page`,
`badge-status-open`/`closed`/`closing`/`opening`, `btn-accent`/`green`/`red`/
`order`/`reserve`, `card-image-overlay`, `card-tagline`, `carousel-hero`,
`ar-cam-edge-left`/`right`.

One is dead for a reason worth noting: `index.css:294` hides
`.grecaptcha-badge` — reCAPTCHA belongs to `firebaseAuth.js`, which is dead
(§15.2). That rule can go with it.

**16 `!important` in 15,451 lines**, ten of them in one `BusinessDetail.css`
block (L1189–1196) overriding a shared section-header style.

---

## APPENDIX I — the SQL layer, and what is missing from it

Read across `gcr-api-clean`: `schema.sql` (663) + 13 files in `sql/` (1,846) +
3 in `migrations/` (254).

**80 `CREATE TABLE` · 59 policies · 121 indexes · and zero `CREATE FUNCTION`.**

### ⚠ Ten of the eleven RPCs the API depends on have no definition in any repo

| RPC | Call sites | Defined in repo? |
|---|---:|---|
| `fuzzy_entity_search` | 4 | **no** |
| `create_booking_if_available` | 3 | **no** |
| `create_booking_hold` | 2 | **no** |
| `find_existing_entity` | 1 | **no** |
| `upsert_preference_score` | 1 | **no** |
| `resource_is_available` | 1 | **no** |
| `resource_blocked_dates` | 1 | **no** |
| `increment_deal_clicks` | 1 | **no** |
| `increment_customer_bookings` | 1 | **no** |
| `exec_sql` | 1 | **no** |
| `entity_sections` | 1 | only as a *proposal* in another repo |

These are not incidental. **`create_booking_if_available` is the atomic
anti-overbook guarantee** that `dashboard.js` and `public.js` both rest on — the
one the API blueprint contrasts favourably against `platform.js`'s wider race
window. `find_existing_entity` and `fuzzy_entity_search` are the duplicate
prevention behind the counterfeit gate. `upsert_preference_score` is Trip Swipe's
ranking.

**They exist only in the live database.** If the Supabase project were rebuilt
from this repository, every one of them would be missing, and the failures would
be silent — PostgREST returns an error the calling code mostly swallows.

Two further notes:

- **`entity_sections`** — the API calls it at `business-data.js:131`. Its only
  DDL anywhere is `Dashboards-users-/sql/entity_sections.sql`, a file whose
  siblings all open *"NEVER RUN. This is a proposal."* A live API dependency is
  defined only in another repo's proposal folder.
- **`exec_sql`** — an RPC that executes arbitrary SQL, called from
  `tourist.js:322` to self-heal a missing table with `CREATE TABLE IF NOT
  EXISTS`. Its definition, and therefore its grants, are not in version control
  either.

`sql/capability_tables.sql` (521 lines, 18 tables, 26 indexes) is the file
`scripts/check-capability-columns.mjs` validates `routes/capabilities.js`
against — and the reason that check passes while the live database disagrees.

---

## APPENDIX G — the 16 root scripts (1,284 lines)

Database dump/export/convert/import one-offs and Playwright-ish verifiers, all at
the repo root rather than in `scripts/`.

**Five reference the production project directly:** `dump-entire-db` (119),
`export-supabase-complete` (235), `export-complete-all-data` (104),
`convert-sql-to-json` (101), `convert-db-to-organized-json` (70). **Two of those
carry the committed `service_role` key** — §16.1. They are why `pg` is a runtime
dependency (§16.2).

The rest: `extract-all-businesses` (83), `import-from-backup` (104),
`insert-restaurants-from-backup` (112), `import-restaurants` (67),
`add-ob-gs-restaurants` (28), and five verifiers — `verify-gcr` (73),
`verify-live` (67), `verify-app` (31), `verify-navigation` (29),
`inspect-page` (31), `debug-error` (30).

None are referenced by `package.json`. None have run in CI. They are working
notes that were committed.

---

## 14. Honesty ledger

**Read in full, line by line:** `App.jsx`, `config.js`, `main.jsx`,
`ErrorBoundary.jsx`, `utils/templateCategory.js`, `services/compassService.js`,
`index.html`, `vercel.json`, `package.json`, `.gitignore`; and — in the
every-line pass — **all 38 pages and all 35 components**, including the four
giants (`BusinessDetail` 2,467, `Swipe` 1,583, `Landing` 915, `Profile` 844),
whose structure, state, effects, helper functions and inline reasoning are
recorded in Appendices A–E.

**Read substantially:** `services/gcrApi.js` (all 15 export signatures, the
cache, `fixUrl`, `toCard`, the preference engine, and every call site),
`context/AppContext.jsx` (the identity model in full plus its complete endpoint
set), `categoryMap.js`, `services/locationService.js`,
`services/supabaseAuth.js`, `services/firebaseAuth.js`,
`scripts/prerender.mjs` (header + schema mapping).

**Read for wiring, not implementation:** the 24 files in `public/` — every one
opened and its API calls extracted and checked against the API's routers
(Appendix F), but the page markup and inline JS not read line by line. The 16
root scripts — purpose, credentials and dependencies established, bodies not
read (Appendix G).

**Also read (Appendices H–I):** all 52 stylesheets, 15,451 lines — which is
where the worst structural defect in the repo turned out to live; and the SQL
layer in `gcr-api-clean`, 2,765 lines across `schema.sql`, `sql/` and
`migrations/`, which is where ten missing function definitions turned up.

**Nothing in this repository is now unread.**

**Verified rather than assumed:** the 53 routes in `App.jsx` against the pages
that exist; the 101 API paths extracted mechanically from every `.js`/`.jsx`
under `src/`; the dead status of `supabaseAuth`/`firebaseAuth` by grepping every
import; the committed key by decoding its JWT payload locally; and — new in this
pass — `rides.html`, `review.html` and `song-request.html` checked call-by-call
against `server.js`, `routes/reviews.js` and `routes/cooperatives.js`.

## 15. Findings — ordered by what they cost

### 15.1 A live `service_role` key is committed to this repository

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

### 15.2 Three dead dependencies, one of them a Postgres driver

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

### 15.3 The tourist site calls four admin endpoints

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

### 15.4 No shared HTTP client and no endpoint registry

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

### 15.5 One error boundary for the whole app

`ErrorBoundary` wraps `<BrowserRouter>`. Any render error in any of 38 pages
blanks the entire site to *"Something went wrong / Reload."*
`Admin-dashboard-main` wraps **each section** so *"one section throwing must not
blank the whole dashboard."* Given `BusinessDetail` is 2,467 lines rendering a
payload assembled from ~90 tables, per-route boundaries would pay for
themselves.

### 15.6 `Dashboard.jsx` — 434 unreachable lines on the legacy API

Not routed in `App.jsx`, so nothing can navigate to it. It is also the only
consumer of `/api/dashboard/*`, the `site_id`-keyed legacy router that
`Dashboards-users-` exists to replace. Either route it, or delete it — an
unroutable page that still ships in the bundle and pins a legacy dependency is
the worst of both.

### 15.7 The static surface has no owner — and two of its pages are broken

24 files in `public/`, nine of them live production URLs wired by
`vercel.json`, carrying the entire consumer face of the universal booking
engine — with no build step, no lint, no test, and no documentation anywhere in
this repo.

The every-line pass (Appendix F) opened all 24 and checked their calls:

- **`rides.html` posts to `/api/rides/request`,** a router commented out in
  `server.js:336`. The live replacement is `/api/transportation/request`, which
  two React pages already use. **The page cannot work.**
- **`review.html` calls `/api/reviews/request` and `/api/reviews/submit`,**
  neither of which exists. The second does not 404 — it binds to
  `POST /api/reviews/:slug` with `slug = "submit"`. Only `ownerRequired` stops it.
  This is the exact shadowed-route hazard `Admin-dashboard-main` documents,
  refuses to reproduce, and wrote `audit-endpoints.mjs` to catch.
- **`qr-menu.html` is 0 bytes.**
- **`song-request.html` works, and does something nothing else does:** it is the
  only fan-facing surface for `/api/cooperatives`. Song crowdfunding is live
  through the static surface. `/api/goals` still has no caller anywhere.

So the surface holds a working feature that was not counted, two pages that
cannot work, and an empty file — none of it covered by any check in any repo.
That is the argument for giving it an owner.

### 15.8 Six stylesheets open `:root`, and the app's accent colour is decided by bundle order

`index.css` owns the token layer. Five other stylesheets also open `:root`;
three redefine tokens it already owns, at identical specificity.

`--accent` is teal `#0b7a75` in `index.css` and **orange `#e85d04` in
`BusinessDetail.css`**, with **36 consumers** across seven other files including
the bottom nav's active state and the Home and Profile header gradients.
`--border` collides across 72 consumers. Because `App.jsx` imports every page
statically, page CSS always loads last — **so orange wins in production.**

Page palettes belong on a page class, not on `:root`. Full table in Appendix H.1.

### 15.9 71% of colour is hardcoded, and there is no dark theme

1,617 raw hex values against 673 token uses. No `prefers-color-scheme` and no
`data-theme` anywhere in 15,451 lines — the only front end without them.
`Dashboards-users-` has zero raw hex outside `:root`; `Admin-dashboard-main` has
36 in 3,139 lines. Appendix H.2.

### 15.10 Ten RPCs the platform depends on exist only in the live database

`create_booking_if_available` — the atomic anti-overbook guarantee under two
booking paths — `create_booking_hold`, `fuzzy_entity_search`,
`find_existing_entity`, `upsert_preference_score`, `resource_is_available`,
`resource_blocked_dates`, `increment_deal_clicks`,
`increment_customer_bookings`, and `exec_sql` have **no `CREATE FUNCTION`
anywhere in any of the four repositories**.

The SQL tree has 80 tables, 59 policies, 121 indexes and **zero functions**.
Rebuild the database from this repo and the booking-correctness layer is gone —
silently, because the calling code mostly swallows the error. Appendix I.

### 15.11 `README.md` is the stock Vite template

50 lines about `@vitejs/plugin-react` and the React Compiler. Not one word about
Gulf Coast Radar, the routes, the API, the static surface, or how to run it
against a local API. The largest and most user-facing repo in the platform is
the only one with no documentation at all — this file is the first attempt at
any.

### 15.12 Smaller notes

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

## 16. What this repo is, in one paragraph

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
