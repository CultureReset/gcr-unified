// Pure helpers of the public layer. No network, no browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import { arrangeModules, normaliseModule, moduleManifest, keepBuiltInActions } from '../src/utils/modules.js'
import { isMissingRoute } from '../src/utils/missingRoute.js'
import { businessJsonLd, itemListJsonLd, offersJsonLd, schemaType, jsonLdText } from '../src/utils/schemaOrg.js'
import { categoryFilter, inSection } from '../src/categoryMap.js'
import { money, dealPrice, whenText, isExpired, areaFacets } from '../src/utils/publicFormat.js'

test('modules: order by position, drop disabled and non-public, accept snake_case', () => {
  const rows = [
    { install_id: 'b', app_key: 'two', position: 2, render_mode: 'button' },
    { installId: 'a', appKey: 'one', position: 1 },
    { install_id: 'c', app_key: 'off', position: 0, public_enabled: false },
    { install_id: 'd', app_key: 'disabled', position: 0, enabled: false },
    { app_key: 'no-id', position: 0 },
  ]
  const out = arrangeModules(rows)
  assert.deepEqual(out.map(m => m.installId), ['a', 'b'])
  assert.equal(out[0].renderMode, 'inline')
  assert.equal(out[1].renderMode, 'button')
  assert.deepEqual(arrangeModules(null), [])
  assert.equal(normaliseModule({ install_id: 7 }).installId, '7')
})

test('schema.org: business from its own fields, empty values dropped', () => {
  const ld = businessJsonLd({ name: 'X', entity_type: 'restaurant', city: 'C', latitude: 1, longitude: 2, rating: 4.5, review_count: 3, hours: [{ day_of_week: 1, opens_at: '09:00:00', closes_at: '17:00:00' }] }, { url: 'https://s/b/x' })
  assert.equal(ld['@type'], 'Restaurant')
  assert.equal(ld.address.addressLocality, 'C')
  assert.equal(ld.address.addressCountry, undefined)
  assert.equal(ld.geo.latitude, 1)
  assert.equal(ld.openingHoursSpecification[0].dayOfWeek, 'https://schema.org/Monday')
  assert.equal(ld.openingHoursSpecification[0].opens, '09:00')
  assert.equal(ld.telephone, undefined)
  assert.equal(schemaType({ entity_type: 'anything', schema_type: 'Dentist' }), 'Dentist')
  assert.equal(schemaType({ entity_type: 'unknown' }), 'LocalBusiness')
  assert.equal(businessJsonLd(null), null)
})

test('schema.org: lists and offers', () => {
  const list = itemListJsonLd({ name: 'L', url: 'u', items: [{ name: 'a', url: 'x' }] })
  assert.equal(list.itemListElement[0].position, 1)
  const offers = offersJsonLd({ name: 'O', offers: [{ name: 'd', price: 5, currency: 'EUR' }] })
  assert.equal(offers.itemListElement[0].priceCurrency, 'EUR')
})

test('format: prices only from data; no currency invented', () => {
  assert.equal(money(null, 'USD'), '')
  assert.equal(money(12, ''), '12')
  assert.match(money(12, 'USD'), /12/)
  assert.equal(dealPrice({ price_label: 'Half off' }, 'USD'), 'Half off')
  assert.equal(dealPrice({}, 'USD'), '')
  assert.match(dealPrice({ deal_price: 10, price_unit: 'person' }, ''), /10 \/ person/)
})

test('format: times, expiry, directions, areas', () => {
  const now = new Date('2026-10-04T12:00:00Z')
  assert.equal(whenText('2026-10-04T12:30:00Z', now), 'in 30 min')
  assert.equal(whenText('', now), '')
  assert.equal(isExpired('2026-10-04T11:00:00Z', now), true)
  assert.equal(isExpired('2026-10-05T11:00:00Z', now), false)
  assert.equal(isExpired(null, now), false)
  assert.deepEqual(areaFacets([{ city: 'B' }, { city: 'A' }, { city: 'B' }, {}]), [{ name: 'B', count: 2 }, { name: 'A', count: 1 }])
})

test('modules: the contract row of GET /api/public/business/:slug/apps, every render mode', () => {
  const row = {
    installId: 'inst_1', appKey: 'booking', version: '1.2.0', renderMode: 'action', publicLabel: 'Book',
    position: 3, enabled: true, publicEnabled: true, config: { days: 7 }, manifest: { name: 'Booking', surfaces: [] },
  }
  assert.deepEqual(normaliseModule(row), row)
  for (const mode of ['inline', 'button', 'page', 'action']) {
    assert.equal(normaliseModule({ ...row, renderMode: mode }).renderMode, mode)
  }
  assert.equal(normaliseModule({ ...row, renderMode: 'popup' }).renderMode, 'inline')
  assert.equal(normaliseModule({ ...row, renderMode: undefined }).renderMode, 'inline')
  const out = arrangeModules([{ ...row, position: 2, installId: 'b' }, row, { ...row, installId: 'c', publicEnabled: false }])
  assert.deepEqual(out.map(m => m.installId), ['b', 'inst_1'])
})

test('missing route: a 404 is "not available yet" only without a handler’s own message', () => {
  assert.equal(isMissingRoute(405, null), true)
  assert.equal(isMissingRoute(501, { error: 'x' }), true)
  assert.equal(isMissingRoute(404, null), true)
  assert.equal(isMissingRoute(404, 'Cannot GET /api/public/business/x/apps'), true)
  assert.equal(isMissingRoute(404, { error: 'API route not found' }), true)
  assert.equal(isMissingRoute(404, { code: 'not_connected' }), true)
  assert.equal(isMissingRoute(404, { error: 'Business not found' }), false)
  assert.equal(isMissingRoute(404, { message: 'No business with slug x' }), false)
  assert.equal(isMissingRoute(404, { detail: 'gone' }), false)
  assert.equal(isMissingRoute(500, null), false)
  assert.equal(isMissingRoute(200, null), false)
})

test('modules: the list row’s manifest first, else the one /public/apps/:installId returned', () => {
  const fromList = { name: 'From list' }
  const fromApp = { name: 'From app' }
  assert.equal(moduleManifest({ manifest: fromList }, { manifest: fromApp }), fromList)
  assert.equal(moduleManifest({ manifest: null }, { manifest: fromApp }), fromApp)
  assert.equal(moduleManifest({ manifest: null }, { settings: {}, data: {} }), null)
  assert.equal(moduleManifest({ manifest: null }, null), null)
})

test('header actions: the built-in Call/Book/Directions stay until an action module is actually drawn', () => {
  const mods = arrangeModules([
    { installId: 'call', appKey: 'call', renderMode: 'action' },
    { installId: 'hours', appKey: 'hours', renderMode: 'inline' },
  ])
  assert.equal(keepBuiltInActions([], {}), true)
  assert.equal(keepBuiltInActions(mods, {}), true)                       // still loading
  assert.equal(keepBuiltInActions(mods, { call: false }), true)          // failed to load or no manifest
  assert.equal(keepBuiltInActions(mods, { hours: true }), true)          // an inline module is not a header action
  assert.equal(keepBuiltInActions(mods, { call: true }), false)
  assert.equal(keepBuiltInActions(mods, { call: true, other: false }), false)
})

test('schema.org: JSON-LD text cannot close its <script> tag', () => {
  const ld = businessJsonLd({ name: 'X', description: 'see </script><script>alert(1)</script>' })
  const text = jsonLdText(ld)
  assert.equal(text.includes('</'), false)
  assert.deepEqual(JSON.parse(text), ld)
  assert.equal(jsonLdText({ a: '<b>' }), '{"a":"<b>"}')
})

test('directory: the section filter ignores case', () => {
  assert.deepEqual(categoryFilter('Restaurants'), categoryFilter('restaurants'))
  assert.ok(categoryFilter('RESTAURANTS').subtypes.includes('seafood_restaurant'))
  assert.ok(categoryFilter('Staying').types.includes('hotel'))
  assert.equal(inSection({ entity_subtype: 'Seafood_Restaurant' }, 'Restaurants'), true)
  assert.equal(inSection({ entity_subtype: 'seafood_restaurant' }, 'staying'), false)
  assert.equal(inSection({ entity_subtype: 'never-heard-of-it' }, 'restaurants'), true)
})
