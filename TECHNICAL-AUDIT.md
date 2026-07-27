# gcr-unified — Technical Audit

Full line-by-line read of every file in `src/` and `public/`. Purpose: permanent reference so nobody has to re-read the whole repo to remember what's real, dead, or broken.

Last full audit: 2026-07-27.

## 0. Framing — read this first

**This is not Next.js.** `package.json` shows `vite`, `vite-plugin-pwa`, `react-router-dom` v7 — a **Vite + React 19 client-side SPA** with client-side `BrowserRouter` routing, plus a postbuild static-prerender script (`scripts/prerender.mjs`) that writes per-entity static HTML/JSON-LD shells into `dist/` for SEO after the Vite build.

**This repo ships two unrelated products in one deploy:**
1. **The Gulf Coast Radar (GCR) tourist app** — the React SPA in `src/` (discovery, swipe, saves, itinerary, AI chat, groups, AR hunts). Talks to `/api/gcr/*`, `/api/tourist/*`, `/api/tourist-auth/*`.
2. **A separate "CyberCheck platform" booking/checkout engine** — hand-rolled vanilla-JS static HTML pages in `public/` (`biz.html`, `book.html`, `manage.html`, `review.html`, `review-wall.html`, `reviews-api.html`, `waiver.html`, `user.html`, `card.html`, `menu-update.html`, `song-request.html`, `rides.html`, `q.html`), routed via `vercel.json` rewrites. Talks to `/api/platform/*` + `/api/stripe/*`.

**Confirmed connected**: `routes/platform.js` in `gcr-api-clean` (see that repo's TECHNICAL-AUDIT.md §3) implements exactly the `/api/platform/*` namespace this repo calls — `/page/:slug`, `/manage/:id`, `/waiver-info`, `/waiver-sign`, `/reviews`, `/u/:code`, `/my-bookings`, `/my-share`, `/rewards`, `/redeem`. **This system is real and wired, not orphaned** — confirmed independently from both sides.

**No hardcoded secrets found** anywhere in `src/` or `public/`. Firebase config and the Supabase key are sourced purely from `import.meta.env.*` with empty-string fallbacks. Stripe is loaded client-side only via a publishable key fetched at runtime from `/api/stripe/config` — never hardcoded.

**Hardcoded backend URL duplication** (not a secret, but a drift risk): `https://gcr-api-clean.vercel.app` is re-declared as a fallback literal in 12+ files instead of one shared constant — `src/config.js:1` plus independently in `ArtistListings.jsx:5`, `ArtistProfile.jsx:5`, `AvailabilityCalendar.jsx:4`, `BookRental.jsx:6`, `BookService.jsx:6`, `Dashboard.jsx:7`, `Deals.jsx:14`, `RentalDetail.jsx:6`, `Reserve.jsx:6`, `ServiceDetail.jsx:5`, `TransportationRequest.jsx:6`, `App.jsx:111`, and every `public/*.html` micro-app (`window.CC_API_BASE || '...'`). An env override wouldn't reliably propagate to all of these.

**Hardcoded PII**: `public/card.html` — static personal digital business card for "Matt Johnson," real phone (`+12058104950`, lines 91-107,258) and email (`info@gulfcoastalhub.com`, line 99,259) baked into HTML/vCard.

**Hardcoded loyalty SMS number**: `src/config.js:11` — `+12513135464`, used across `GCRHeader.jsx`, `Landing.jsx`, `Swipe.jsx`, `Auth.jsx`.

**Root `.mjs` scripts** (`dump-entire-db.mjs`, `export-*.mjs`, `import-*.mjs`, `convert-*.mjs`, `verify-*.mjs`, `inspect-page.mjs`, `debug-error.mjs`, `add-ob-gs-restaurants.mjs`) — one-off local data scripts, not reviewed line-by-line this pass. Uses the `pg` package directly — check separately for hardcoded Postgres connection strings before treating as clean.

## 1. src/ root

| File | Status |
|---|---|
| `main.jsx` | WORKING — React entry |
| `App.jsx` | WORKING — route table, header/nav visibility rules, page-view tracker (`POST /api/gcr/track`, `:121`) |
| `ErrorBoundary.jsx` | WORKING (trivial) |
| `categoryMap.js` | WORKING — static subtype→section taxonomy + `hydrateTaxonomy()` merging server taxonomy (`GET /api/gcr/taxonomy`, `:147`) over hardcoded fallback. **Must be kept in sync by hand with `gcr-api-clean/utils/listing-category-map.js`** — see that repo's audit §7 |
| `config.js` | WORKING — central env constants |

## 2. src/context/AppContext.jsx

Global auth/session, saves, super-likes, itinerary, seen-slugs batching, location sharing, guest-id merge-on-signup. Real logic, real batching/flush queues. Endpoints: `GET /api/tourist/me`, `POST/DELETE /api/tourist/seen`, `POST /api/tourist/swipes`, `PUT /api/tourist/profile`, `POST /api/tourist/saves`, `DELETE /api/tourist/saves/:slug`, `DELETE /api/tourist/super-likes/:slug`, `PUT /api/tourist/itinerary`. Also calls public `nominatim.openstreetmap.org` (hotel geocoding, `:470`) — external, unrelated to gcr-api-clean.

## 3. src/services/

| File | Status | Notes |
|---|---|---|
| `gcrApi.js` | WORKING, substantial | Business cards, swipe-deck assembly (promo/deal/sponsored card injection), preference scoring, saves. Home-grown response cache. Endpoints: `/api/gcr/entities`, `/entity/:slug`, `/entities/:slug/children`, `/live-now`, `/api/tourist/preferences`, `/api/tourist/saves`, `/api/gcr/home-feed`, `/api/admin/tripswipe/settings`, `/promo-cards`, `/sponsored`, `/api/deals/swipe` |
| `locationService.js` | WORKING | Geolocation watch loop, 30s background ping, geofence settings. `POST /api/tourist/location`, `PUT /location-settings` |
| `compassService.js` | WORKING (pure math) | Bearing/heading for AR overlay |
| `firebaseAuth.js` | **DEAD** | Not imported by `Auth.jsx` (explicitly commented out there: "Firebase phone auth disabled - use email/password only"). Still fully implemented, would work if re-enabled. `firebase` package stays in `package.json` purely for this dead path |
| `supabaseAuth.js` | **DEAD** | Confirmed via grep, never imported anywhere. Real auth goes through `/api/tourist-auth/*` (`Auth.jsx`) instead |

## 4. src/utils/templateCategory.js — **DEAD**
`resolveTemplate`, `RENTAL_SUBTYPES`, `TOUR_SUBTYPES` — confirmed unused via grep, not imported anywhere.

## 5. src/data/
`catTabs.js` — WORKING, the real 13-tab taxonomy + `matchesCategory()`, used by `Search.jsx`/`Swipe.jsx`. `categories.js` — WORKING but older/cruder 7-bucket list, used in parallel by `Home.jsx`'s explore grid and `gcrApi.js`'s `mapCategory()`/`Swipe.jsx` badges. Two taxonomy systems coexist by design, not a bug, but worth knowing which one a given page uses.

## 6. src/components/ (21 files) — all WORKING unless noted

`AiChat.jsx` (floating AI concierge, `POST /api/tourist/ai-chat`, login-gated), `ArCameraOverlay.jsx` (camera+compass AR overlay, real device APIs), `AvailabilityCalendar.jsx` (`GET /api/availability/resource/:id[/quote]`), `BlogSection.jsx` (`GET /api/blog/:slug`), `BookingCalendar.jsx` (`GET/POST /api/bookings/:slug[/availability]` — imported by `BusinessDetail.jsx` but not confirmed visibly rendered; spot-check if you touch it), `BottomNav.jsx`, `EntityCard.jsx`, `GCRCard.jsx` (primary listing card, tags/hours/happy-hour/actions), `GCRHeader.jsx` (sticky header + loyalty SMS modal), `GallerySection.jsx` (`GET /api/gallery/:slug[/categories]`), `HubTemplate.jsx` (multi-business hub profile, uses `gcrApi.js`'s `/entities/:slug/children`), `IndustryFacts.jsx` (pure render), `InstallBanner.jsx` (PWA add-to-home-screen), `LocationPicker.jsx` (`GET /api/gcr/locations/autocomplete`), `PageHeader.jsx`, `PoliciesSection.jsx` (`GET /api/faqs/:slug`), `ReviewsSection.jsx` (`GET /api/reviews/:slug[/stats]`, `POST /api/tourist/reviews`), `SectionRenderer.jsx` (pure render, entity_sections layouts), `SkeletonLoader.jsx`, `TeamSection.jsx` (`GET /api/team/:slug`), `Toast.jsx`.

## 7. src/pages/ (42 files)

### Discovery / search / category listing
- `Landing.jsx` — WORKING, public home (`/`): weather (public `open-meteo.com`), happy-hour/live-music/things-to-do/restaurant/stay rails, master-calendar, loyalty SMS, PWA install. `GET /api/gcr/home-feed`, `/entities?type=…` ×3
- `Home.jsx` — WORKING, logged-in home feed (`/home`), uses `fetchHomeFeed()`
- `Search.jsx` — WORKING, keyword search + autocomplete + date-availability search + localStorage saved searches. `POST /api/gcr/search`, `/search/suggest`, `/availability-search`
- `CategoryPage.jsx` — WORKING, `/restaurants` etc. `GET /api/gcr/happy-hours`, `/entities?limit=1000&offset=…`
- `CategoryListings.jsx` — WORKING, `/category/:category` — **functionally duplicates `CategoryPage.jsx` under a different route shape**, not a bug, just redundant
- `Browse.jsx` — **DEAD**, not routed in `App.jsx` (`/browse` redirects to `/` instead). Calls `GET /api/gcr/sections`, an endpoint that appears nowhere else in either repo — may never have existed server-side
- `Events.jsx` — WORKING, `/events`, date/type filters + live-ranking. `GET /api/gcr/events`
- `Deals.jsx` — WORKING, `/deals` + self-serve "post a deal." `GET /api/deals?active=true`, `POST /api/deals/submit`
- `LiveFeed.jsx` — WORKING, `/feed`, infinite-scroll social embeds. `GET /api/gcr/social-posts/feed`
- `ArtistListings.jsx` — WORKING, `/artists`. `GET /api/artists`
- `RentalListings.jsx` — WORKING, `/staying`. `GET /api/gcr/stay-units`, `/entities?limit=1000&offset=…`
- `ServiceListings.jsx` — WORKING, `/services`. `GET /api/gcr/entities?limit=1000&offset=…`

### Entity/business detail
- `BusinessDetail.jsx` — WORKING, 2463 lines, the flagship profile page: tabs, menu/drinks/specials/HH, offerings, industry facts, availability widget, click-attribution, related siblings. `GET /api/gcr/entity/:slug` (cached), `/reviews/:slug/stats`, `/team/:slug`, `/blog/:slug`, `/faqs/:slug?category=cancellation`, `/email-parser/availability/:slug`, `POST /api/tourist/track-click`
- `LinksPage.jsx` — WORKING, `/links/:slug`, modal-driven linktree profile. `GET /api/gcr/entity/:slug`
- `RentalDetail.jsx` — WORKING, `/rental/:slug`. `GET /api/rentals/:slug`, reviews, `POST /bookings`, `POST /reviews`
- `ServiceDetail.jsx` — WORKING, `/service/:slug`. `GET /api/services/:slug`, reviews, `/availability`, `POST /bookings`
- `ArtistProfile.jsx` — WORKING, `/artist/:slug`. `GET /api/artists/:slug`, reviews, `POST /api/artist-bookings`, `POST /reviews`
- `ArtistLive.jsx` — WORKING, `/artist/:slug/live`, headerless "now playing" money page (Venmo/CashApp deep links). `GET /api/gcr/artist/:slug/live`, `/artists/:slug/queue`, `POST .../request`
- `RestaurantMenu.jsx` — WORKING, `/menu/:slug`. `GET /api/public/menu?slug=…`
- `TransportationRequest.jsx` — WORKING, `/transportation/:slug`. `GET /api/gcr/entity/:slug`, `POST /api/transportation/request`

### Booking flows
- `BookRental.jsx` — WORKING, `/book-rental/:slug`. `GET /api/rentals/:slug`, `POST /bookings`
- `BookService.jsx` — WORKING, `/book-service/:slug`. `GET /api/services/:slug`, `POST /bookings`
- `Reserve.jsx` — WORKING, `/reserve/:slug`, real multi-step: SMS opt-in gate → optional waiver → party/date/time (real-slot-aware) → transportation add-on → submit. `GET /api/gcr/entity/:slug`, `/email-parser/availability/:slug`, `POST /api/gcr/opt-in`, `/waiver/:slug/sign`, `/api/email-parser/manual`, `/api/transportation/request`
- `Confirmation.jsx` — WORKING, static thank-you screen, no fetch
- Standalone `public/book.html`+`manage.html` — separate universal checkout/self-serve manage system, see §9

### Reviews
- `ReviewsSection.jsx` component — WORKING, in-profile
- `ReviewUpload.jsx` — WORKING, `/review/:slug`, standalone photo-upload-as-review. `POST /api/tourist/photos`
- Standalone `public/review.html`, `review-wall.html`, `verified-review.html`, `reviews-api.html`, `reviews-embed.js`, `embed.js` — separate "CyberCheck Reviews" verified-review product, see §9

### AI chat / concierge
- `AiChat.jsx` component (see §6)
- `Building.jsx` — WORKING, `/building`, AI itinerary-builder loading screen with local fallback for signed-out users. `POST /api/tourist/build-itinerary`
- `Itinerary.jsx` — WORKING, `/itinerary`, AI-built day-by-day view + email. `POST /api/tourist/itinerary/email`

### Trip Swipe / gamification
- `Swipe.jsx` — WORKING, 1584 lines, the largest file in the app. `/swipe/:category`. TinderCard deck, feed/social/promo/deal card injection, personalization, SMS opt-in prompt, trip-context edit modal, undo/maybe. `GET /api/gcr/social-posts/feed`, `/api/admin/sms-config` (+ everything via `gcrApi.js`)
- `MyList.jsx` — WORKING, `/list`, saved places + must-do list (via `AppContext`)
- `Saves.jsx` — WORKING, `/saves` — **functionally near-duplicate of `MyList.jsx` under a different route**
- `ArHunts.jsx` — WORKING, `/ar-hunts`, geolocation scavenger hunt. `GET /api/ar-hunts/nearby`, `POST .../capture`
- `Groups.jsx`/`Group.jsx` — WORKING, `/groups`, `/group/:slug`, collaborative group-trip saves, invite links, must-do overlap. `GET/POST /api/tourist/groups`, `POST .../join`, `GET .../:slug`, `POST .../create-invite`
- `Invite.jsx` — WORKING, `/join?t=`. `GET /api/tourist/groups/invite/:token`, `POST .../accept`
- `Profile.jsx` — WORKING, large: trip details, points/rewards, referral share, bookings history, photos, reviews, account mgmt. `GET /api/tourist/groups`, `/photos`, `/reviews`, `/points`, `/api/platform/my-bookings`, `/my-share`; `POST /api/platform/my-share`, `/my/videos`, `/redeem`; `GET /api/platform/rewards/:slug`; `POST /api/tourist/upload-media`, `/photos`; `POST/GET /api/tourist-auth/add-email`, `/verify-add-email`
- `Setup.jsx` — WORKING, `/setup/*`, dynamic server-driven onboarding questionnaire. `GET /api/tourist/setup-questions` — **note: per gcr-api-clean's audit, this hits `tourist.js`'s hardcoded stub, not the admin-editable DB table (`setup-questions.js`), due to a routing bug on the backend side**

### Auth / account
- `Auth.jsx` — WORKING (phone flow, primary/live). `/auth`. Phone-OTP + WebOTP autofill. Email/password flow is **built but UI-hidden** (code intact, not deleted). Magic-link handling **explicitly dead-ended** (comment `:69-74` — backend route still exists but page no longer calls it). `POST /api/tourist-auth/signup`, `/signin`, `/phone`, `/phone-verify`, `/verify`, `/resend`, `/forgot-password`
- `Reset.jsx` — WORKING, `/reset`. `POST /api/tourist-auth/reset-password`
- `Privacy.jsx`, `Terms.jsx` — WORKING, static legal pages, real dated content, contact `info@cybercheckinc.com`
- `NotFound.jsx` — WORKING, 404

### Admin-adjacent
- `Dashboard.jsx` — **DEAD ROUTE** (not in `App.jsx`'s route table, unreachable in the SPA) **+ mostly STUB**: `OverviewSection`, `ProfileSection`, `QueueSection`, `BookingsSection`, `AnalyticsSection`, `MessagesSection`, `SettingsSection` (`:266-434`) are one-line placeholder divs. Only `CalendarSection` (`:282-422`) is real — working iCal-connect feature. `GET /api/dashboard/businesses`, `/units`, `/ical/external`, `/ical/feed-url`, `POST/DELETE /ical/external/:id`, `POST .../sync-now`
- `public/menu-update.html` — WORKING, real standalone menu/drinks/specials editor for owners. `GET /api/gcr/menu-editor-data`, `POST /menu-editor-save`
- `public/manage.html` — WORKING, self-serve manage/cancel/reschedule (HMAC-token auth, no login). `/api/platform/manage/:id[...]`

## 8. Dead / stub / broken — quick reference

| File | Classification | Why |
|---|---|---|
| `src/pages/Browse.jsx` | DEAD | Not routed; `/browse` redirects to `/`; calls a possibly-nonexistent endpoint |
| `src/pages/Dashboard.jsx` | DEAD route + STUB content | Not routed anywhere; 7 of 8 tab sections are one-line placeholders |
| `src/services/supabaseAuth.js` | DEAD | Never imported |
| `src/services/firebaseAuth.js` | DEAD | Only consumer has it commented out |
| `src/utils/templateCategory.js` | DEAD | Never imported |
| `public/qr-menu.html` | DEAD | 0-byte empty file |
| `public/booking.html` | BROKEN/DEAD | References `/css/sales.css` + `/js/sales-config.js`, neither exists in this repo; not reachable via any `vercel.json` rewrite |
| `Auth.jsx` magic-link handling | Intentionally dead-ended | Backend route still exists, deliberately no longer called |
| `Auth.jsx` "Text BEACH" one-tap SMS signup | Intentionally hidden | Suppressed pending A2P 10DLC approval, backend flow intact |

No `setTimeout`-fake or hardcoded-mock-data STUB patterns found beyond `Dashboard.jsx`'s placeholders — the rest of the routed app is consistently wired to real `fetch()` calls.

## 9. public/ micro-apps — the "CyberCheck platform" system

| File | Route (via `vercel.json`) | Status | Endpoints |
|---|---|---|---|
| `biz.html` | `/p/:slug` | WORKING | `GET /api/platform/page/:slug`, `POST .../submit/:blockId` |
| `book.html` | `/book/:slug/:app` | WORKING | `GET /api/platform/page/:slug`, `/availability`, `/promo/:code`; `GET/POST /api/stripe/{config,create-payment-intent}`; `POST .../submit/:appId` |
| `manage.html` | `/manage/:id?t=` | WORKING | `GET/POST /api/platform/manage/:id[/cancel|/reschedule]` |
| `waiver.html` | `/waiver/:slug?b=&t=` | WORKING | `GET /api/platform/waiver-info/:slug`, `POST .../waiver-sign/:slug` |
| `review-wall.html` | `/reviews/:slug` | WORKING | `GET /api/platform/reviews/:slug` |
| `verified-review.html` | `/r/:slug?t=` | WORKING | `GET /api/platform/review-token/:token`, `POST /reviews` |
| `reviews-api.html` | `/developers/reviews` | WORKING | `GET /api/platform/reviews/:slug` (developer sandbox/docs) |
| `user.html` | `/u/:code` | WORKING | `GET /api/platform/u/:code` (referral link-tree) |
| `card.html` | (standalone, hardcoded personal card) | WORKING (lead form real) | `POST /api/gcr/nfc-card-lead` |
| `menu-update.html` | (business owner tool) | WORKING | `GET /api/gcr/menu-editor-data`, `POST /menu-editor-save` |
| `song-request.html` | (rewritten from `/:slug/profile`) | WORKING | `GET /api/artists/:slug`, `/queue`, `POST /request`, `GET/POST /api/cooperatives/:slug/...` |
| `rides.html` | standalone | WORKING | `POST /api/rides/request` |
| `q.html` | QR-scan redirect/tracking | WORKING | `POST /api/qr/scan/:code` |
| `booking.html` | marketing page | **BROKEN/DEAD** | Missing `/css/sales.css` + `/js/sales-config.js`, no rewrite points to it |
| `qr-menu.html` | — | **DEAD, 0-byte empty** | — |
| `embed.js` | paste-anywhere embed script | WORKING (pure client link generator) | none |
| `reviews-embed.js` | paste-anywhere reviews widget | WORKING | `GET /api/platform/reviews/:slug` |

## 10. Backend-surface gap checklist (all confirmed real via gcr-api-clean's own audit — cross-referenced 2026-07-27)

Everything below IS implemented server-side (`platform.js`) — this section stays as a checklist in case future work in either repo drifts:
- `/api/platform/page/:slug` (+submit/:blockId) ✅
- `/api/platform/manage/:id` (+cancel/+reschedule) ✅
- `/api/platform/waiver-info/:slug`, `/waiver-sign/:slug` ✅
- `/api/platform/review-token/:token`, `/reviews` (POST), `/reviews/:slug` (GET) ✅
- `/api/platform/u/:code` ✅
- `/api/platform/my-bookings`, `/my-share`, `/my/videos`, `/rewards/:slug`, `/redeem` ✅
- `/api/stripe/config`, `/create-payment-intent` ✅

Medium-risk, single-page-only, not independently re-verified against `gcr-api-clean`'s route list this pass — check before relying on them:
- AR Hunts (`/api/ar-hunts/*`) — confirmed real in gcr-api-clean audit ✅
- Artist money features (`/api/artists/*`, `/api/cooperatives/*`) — confirmed real ✅
- Groups (`/api/tourist/groups*`) — confirmed real ✅
- Rewards/points (`/api/tourist/points`) — not independently verified
- AI concierge/itinerary (`/api/tourist/ai-chat`, `/build-itinerary`) — confirmed real ✅
- Menu self-service (`/api/gcr/menu-editor-data`, `-save`) — not independently verified
- Rides broker (`/api/rides/request`) — **`rides.js` is unmounted in gcr-api-clean** (superseded by `transportation.js`), so this call in `public/rides.html` likely fails. Verify.
- QR tracking (`/api/qr/scan/:code`) — confirmed real ✅
- Deals self-serve (`/api/deals/submit`) — confirmed real ✅
- `Browse.jsx`'s `/api/gcr/sections` — dead code path, doesn't matter, endpoint name not found anywhere in gcr-api-clean
