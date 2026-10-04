// The runtime projection of a business's installed apps (CONTRACT §14,
// business_app_instances) as the public pages use it. Pure; tested by node --test.

function pick(row, ...keys) {
  for (const k of keys) if (row?.[k] !== undefined && row?.[k] !== null) return row[k]
  return undefined
}

/** Normalise one business_app_instances row (camelCase or snake_case). */
export function normaliseModule(row) {
  const installId = pick(row, 'installId', 'install_id')
  const appKey = pick(row, 'appKey', 'app_key', 'itemKey', 'item_key')
  return {
    installId: installId != null ? String(installId) : '',
    appKey: appKey != null ? String(appKey) : '',
    version: pick(row, 'version') || null,
    renderMode: String(pick(row, 'renderMode', 'render_mode') || 'inline'),
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

