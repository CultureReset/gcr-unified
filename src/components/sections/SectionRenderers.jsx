// Generic entity_sections renderer registry.
//
// The admin editor's "Sections" tab (entity_sections + entity_section_items)
// is how non-restaurant businesses (condos, vacation rentals, activities,
// services, shops) store their real content — rooms, pricing, offerings,
// amenities, highlights, policies, tour types, process steps. Until now
// nothing on the public site rendered it. This file is the small renderer
// registry RestaurantMenu.jsx uses to display it, keyed by the real
// `section_type` values that exist in the data today (see 010_display_
// template_config.sql for the live distribution).
//
// Every renderer receives one `section` object of the shape returned by
// GET /api/public/menu's `entity_sections` array:
//   { id, section_type, section_name, subtitle, icon, layout, image_url,
//     items: [{ id, item_name, description, price_from, price_to,
//               price_label, duration, icon, image_url, metadata, tiers }] }

function formatPrice(item) {
  const { price_from, price_to, price_label } = item;
  if (price_from != null && price_to != null && price_from !== price_to) {
    return `$${price_from}–$${price_to}`;
  }
  if (price_from != null) {
    return price_label ? `$${price_from} ${price_label}` : `$${price_from}`;
  }
  return price_label || null;
}

// Cards layout — item name, description, price, duration. Used for the
// content-rich section types (rooms, pricing, offerings, tour_types).
function CardsSection({ section }) {
  return (
    <div className="menu-section entity-section entity-section-cards">
      <h2>{section.icon ? `${section.icon} ` : ''}{section.section_name}</h2>
      {section.subtitle && <p className="entity-section-subtitle">{section.subtitle}</p>}
      <div className="items-grid">
        {section.items.map((item) => {
          const price = formatPrice(item);
          return (
            <div key={item.id} className="menu-item">
              {item.image_url && <img src={item.image_url} alt={item.item_name} />}
              <h3>{item.item_name}</h3>
              {item.description && <p className="item-desc">{item.description}</p>}
              {(price || item.duration || item.tiers?.length > 0) && (
                <div className="item-footer entity-section-footer">
                  <span>
                    {price && <span className="price">{price}</span>}
                    {item.duration && <span className="entity-section-duration"> · {item.duration}</span>}
                  </span>
                </div>
              )}
              {item.tiers?.length > 0 && (
                <ul className="entity-section-tiers">
                  {item.tiers.map((t) => (
                    <li key={t.id}>{t.audience || t.unit_label || 'Rate'}{t.is_free ? ' — Free' : t.price != null ? ` — $${t.price}` : ''}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Chips layout — short tag-like items with no price/description (amenities,
// what a business is "best for").
function ChipsSection({ section }) {
  return (
    <div className="menu-section entity-section entity-section-chips">
      <h2>{section.icon ? `${section.icon} ` : ''}{section.section_name}</h2>
      {section.subtitle && <p className="entity-section-subtitle">{section.subtitle}</p>}
      <div className="entity-section-chip-row">
        {section.items.map((item) => (
          <span key={item.id} className="entity-section-chip">
            {item.icon ? `${item.icon} ` : ''}{item.item_name}
          </span>
        ))}
      </div>
    </div>
  );
}

// Bullet list layout — highlights, policies, process steps: short text
// items, order matters, no price.
function BulletsSection({ section }) {
  return (
    <div className="menu-section entity-section entity-section-bullets">
      <h2>{section.icon ? `${section.icon} ` : ''}{section.section_name}</h2>
      {section.subtitle && <p className="entity-section-subtitle">{section.subtitle}</p>}
      <ul className="entity-section-bullet-list">
        {section.items.map((item) => (
          <li key={item.id}>
            <strong>{item.item_name}</strong>
            {item.description && <span className="item-desc"> — {item.description}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Generic rich-text fallback — any section_type not otherwise registered.
// Renders whatever is present without assuming a price/duration/tiers shape.
function GenericSection({ section }) {
  return (
    <div className="menu-section entity-section entity-section-generic">
      <h2>{section.icon ? `${section.icon} ` : ''}{section.section_name}</h2>
      {section.subtitle && <p className="entity-section-subtitle">{section.subtitle}</p>}
      {section.items?.length > 0 ? (
        <div className="items-grid">
          {section.items.map((item) => (
            <div key={item.id} className="menu-item">
              {item.image_url && <img src={item.image_url} alt={item.item_name} />}
              <h3>{item.item_name}</h3>
              {item.description && <p className="item-desc">{item.description}</p>}
              {formatPrice(item) && (
                <div className="item-footer entity-section-footer">
                  <span className="price">{formatPrice(item)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="item-desc">No details available.</p>
      )}
    </div>
  );
}

// Registry keyed by the real section_type values in entity_sections today.
export const sectionRenderers = {
  rooms: CardsSection,
  pricing: CardsSection,
  offerings: CardsSection,
  tour_types: CardsSection,
  amenities: ChipsSection,
  best_for: ChipsSection,
  highlights: BulletsSection,
  policies: BulletsSection,
  process: BulletsSection,
  whats_included: BulletsSection,
};

// Resolve the renderer for a section, falling back to the generic renderer
// for any section_type not in the registry above (new/unanticipated types
// still render instead of silently disappearing).
export default function SectionRenderer({ section }) {
  const Renderer = sectionRenderers[section.section_type] || GenericSection;
  return <Renderer section={section} />;
}
