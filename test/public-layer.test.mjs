// Pure helpers of the public layer. No network, no browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import { arrangeModules, normaliseModule } from '../src/utils/modules.js'
import { businessJsonLd, itemListJsonLd, offersJsonLd, schemaType } from '../src/utils/schemaOrg.js'
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
