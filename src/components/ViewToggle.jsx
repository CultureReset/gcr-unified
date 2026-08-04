import './ViewToggle.css'

// ─── View toggle ──────────────────────────────────────────────────────────────
//
// Two views, labelled in words. Icon-only grid/list glyphs test badly — people
// can't tell which one they're currently in, let alone what the other one does.
//
// Most people never touch a view switcher at all, so the default matters far
// more than the control: see useListingView() in ../lib/useListingView.js for
// how the default is chosen and when it auto-flips.

export default function ViewToggle({ view, onChange }) {
  return (
    <div className="vt" role="group" aria-label="Layout">
      <button
        className={`vt-btn ${view === 'browse' ? 'active' : ''}`}
        onClick={() => onChange('browse')}
        aria-pressed={view === 'browse'}
      >
        Browse
      </button>
      <button
        className={`vt-btn ${view === 'list' ? 'active' : ''}`}
        onClick={() => onChange('list')}
        aria-pressed={view === 'list'}
      >
        All places
      </button>
    </div>
  )
}
