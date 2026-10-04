// The runtime projection of a business's installed apps, one row per install
// from GET /api/public/business/:slug/apps (STEP3-CONTRACT §B, entity_modules):
//   { installId, appKey, version, renderMode, publicLabel, position, enabled,
//     publicEnabled, config, manifest }
// as the public pages use it. Pure; tested by node --test.

/** How a module is shown on the business's page (the entity_modules.render_mode check). */
export const RENDER_MODES = ['inline', 'button', 'page', 'action']

function pick(row, ...keys) {
  for (const k of keys) if (row?.[k] !== undefined && row?.[k] !== null) return row[k]
  return undefined
}

/** Normalise one row of the projection (camelCase as served, or snake_case). */
export function normaliseModule(row) {
  const installId = pick(row, 'installId', 'install_id')
  const appKey = pick(row, 'appKey', 'app_key', 'itemKey', 'item_key')
  const renderMode = String(pick(row, 'renderMode', 'render_mode') || 'inline')
  return {
    installId: installId != null ? String(installId) : '',
    appKey: appKey != null ? String(appKey) : '',
    version: pick(row, 'version') || null,
    renderMode: RENDER_MODES.includes(renderMode) ? renderMode : 'inline',
    publicLabel: pick(row, 'publicLabel', 'public_label') || '',
    position: Number(pick(row, 'position') ?? 0) || 0,
    enabled: pick(row, 'enabled') !== false,
    publicEnabled: pick(row, 'publicEnabled', 'public_enabled') !== false,
    config: pick(row, 'config') || {},
    manifest: pick(row, 'manifest') || null,
  }
}

/** Order and filter a module list exactly as the projection says: enabled, public, by position. */
export function arrangeModules(rows) {
  return (Array.isArray(rows) ? rows : [])
    .map(normaliseModule)
    .filter(m => m.installId && m.enabled && m.publicEnabled)
    .sort((a, b) => a.position - b.position)
}


/**
 * The manifest a module is drawn with: the list row carries it; when it does
 * not, the one GET /api/public/apps/:installId returned alongside the data.
 */
export function moduleManifest(mod, loaded) {
  return mod?.manifest || loaded?.manifest || null
}

/**
 * Header action row: do the page's built-in actions (Call, Book, Directions …)
 * stay? Yes until one of the installed action modules has actually been drawn;
 * `drawn` maps installId → whether its view rendered. A module that failed to
 * load, or is still loading, never takes the built-in buttons away.
 */
export function keepBuiltInActions(modules, drawn = {}) {
  return !(Array.isArray(modules) ? modules : []).some(m => m.renderMode === 'action' && drawn[m.installId] === true)
}
