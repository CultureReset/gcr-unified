// schema.org JSON-LD for public pages. Plain ESM with no browser or Vite
// imports, so the SPA and scripts/prerender.mjs build the same data.

// Fallback only: a business's own schema.org type comes from its data
// (entity.schema_type / schema_org_type) when gcr-api-clean provides it. This
// map is the one the prerender already used, kept so pages don't regress
// while that column is missing.
const LEGACY_TYPE = {
  restaurant: 'Restaurant', bar: 'BarOrPub', coffee: 'CafeOrCoffeeShop', dessert: 'CafeOrCoffeeShop',
  bakery: 'Bakery', hotel: 'LodgingBusiness', condo: 'LodgingBusiness', 'vacation-rental': 'LodgingBusiness',
  activity: 'TouristAttraction', park: 'Park', shopping: 'Store', service: 'LocalBusiness',
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function clean(value) {
  if (Array.isArray(value)) {
    const arr = value.map(clean).filter(v => v !== undefined)
    return arr.length ? arr : undefined
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      const c = clean(v)
      if (c !== undefined) out[k] = c
    }
    const keys = Object.keys(out).filter(k => k !== '@type' && k !== '@context')
    return keys.length ? out : undefined
  }
  if (value === null || value === undefined || value === '') return undefined
  return value
}

export function schemaType(entity) {
  return entity?.schema_type || entity?.schema_org_type || LEGACY_TYPE[String(entity?.entity_type || '').toLowerCase()] || 'LocalBusiness'
}

export function openingHours(hours) {
  if (!Array.isArray(hours)) return undefined
  return hours
    .filter(h => h && !h.is_closed && h.opens_at && h.closes_at)
    .map(h => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${typeof h.day_of_week === 'number' ? DAYS[h.day_of_week] : h.day_of_week}`,
      opens: String(h.opens_at).slice(0, 5),
      closes: String(h.closes_at).slice(0, 5),
    }))
}

/** A business as schema.org LocalBusiness (or its subtype). */
export function businessJsonLd(entity, { url, image } = {}) {
  if (!entity) return null
  const photo = image || entity.hero_image_url || (entity.photos || []).map(p => (typeof p === 'string' ? p : p?.url || p?.image_url)).find(Boolean)
  const sameAs = [entity.website_url, entity.social_instagram, entity.social_facebook, entity.social_tiktok].filter(u => /^https?:\/\//.test(String(u || '')))
  return clean({
    '@context': 'https://schema.org',
    '@type': schemaType(entity),
    name: entity.name,
    description: entity.description || entity.editorial_summary || entity.subtitle,
    image: photo,
    url,
    telephone: entity.phone || entity.national_phone,
    email: entity.email,
    priceRange: entity.price_range,
    address: {
      '@type': 'PostalAddress',
      streetAddress: entity.address_line_1,
      addressLocality: entity.city,
      addressRegion: entity.state,
      postalCode: entity.postal_code || entity.zip,
      addressCountry: entity.country,
    },
    geo: entity.latitude != null && entity.longitude != null
      ? { '@type': 'GeoCoordinates', latitude: Number(entity.latitude), longitude: Number(entity.longitude) }
      : undefined,
    aggregateRating: entity.rating
      ? { '@type': 'AggregateRating', ratingValue: Number(entity.rating), reviewCount: Number(entity.review_count) || 1 }
      : undefined,
    openingHoursSpecification: openingHours(entity.hours),
    sameAs,
    parentOrganization: entity.parent?.name ? { '@type': 'Organization', name: entity.parent.name } : undefined,
  })
}

/** A list page (directory section, search results, a results page, a trip plan). */
export function itemListJsonLd({ name, url, items }) {
  return clean({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url,
    itemListElement: (items || []).map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: it.url })),
  })
}

/** Deals and last-minute openings as schema.org Offers. */
export function offersJsonLd({ name, url, offers }) {
  return clean({
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name,
    url,
    itemListElement: (offers || []).map(o => ({
      '@type': 'Offer',
      name: o.name,
      price: o.price,
      priceCurrency: o.currency,
      availabilityEnds: o.expiresAt,
      url: o.url,
      offeredBy: o.business ? { '@type': 'LocalBusiness', name: o.business } : undefined,
    })),
  })
}

/** The site itself, with its search box. */
export function websiteJsonLd({ name, url, searchPath }) {
  return clean({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    potentialAction: searchPath && url
      ? { '@type': 'SearchAction', target: `${url}${searchPath}{search_term_string}`, 'query-input': 'required name=search_term_string' }
      : undefined,
  })
}

/**
 * JSON-LD as text for a <script type="application/ld+json">: a "</" inside
 * the data is written "<\/" so it can never close the tag. Parses back to
 * the same value.
 */
export function jsonLdText(jsonLd) {
  return JSON.stringify(jsonLd).replace(/<\//g, '<\\/')
}
