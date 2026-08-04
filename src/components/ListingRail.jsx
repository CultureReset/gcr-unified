import { useRef, useState, useEffect, useCallback } from 'react'
import './ListingRail.css'

// ─── Listing rail ─────────────────────────────────────────────────────────────
//
// A horizontally scrolling row with a header. Two details here are load-bearing
// and shouldn't be "cleaned up":
//
//  1. The rail is padded so the next card is always partially visible at the
//     right edge. That peek is the only affordance telling anyone the row
//     scrolls; a rail whose cards end flush with the viewport doesn't get
//     swiped. See ListingRail.css.
//
//  2. Every rail has a "View all N →" escape hatch. Engagement inside a
//     carousel falls off hard past the first few items, so a rail on its own
//     hides most of the catalogue. The escape hatch is what makes it safe to
//     show ten places out of eighty.

export default function ListingRail({ eyebrow, title, count, onViewAll, children }) {
  const ref = useRef(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  const sync = useCallback(() => {
    const el = ref.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    // Scroll-snap parks the first card flush with the scrollport, which puts a
    // resting scrollLeft equal to the scroller's inline padding — not 0. Testing
    // against 0 leaves the back arrow showing on a rail that hasn't moved.
    const restingLeft = parseFloat(getComputedStyle(el).paddingLeft) || 0
    setAtStart(el.scrollLeft <= restingLeft + 2)
    // Sub-pixel widths mean scrollLeft never quite reaches max — hence the slack.
    setAtEnd(el.scrollLeft >= max - 2)
  }, [])

  useEffect(() => {
    sync()
    const el = ref.current
    if (!el) return
    // Card count can change under us (filters, late-arriving data), which
    // changes scrollWidth without firing a scroll event.
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [sync, children])

  const scroll = (dir) => {
    const el = ref.current
    if (!el) return
    // Roughly one card-and-a-bit, so a click never lands a card boundary exactly
    // on the right edge (which would hide the peek).
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 200), behavior: 'smooth' })
  }

  return (
    <section className="lr">
      <header className="lr-head">
        <div className="lr-head-text">
          {eyebrow && <p className="lr-eyebrow">{eyebrow}</p>}
          <h2 className="lr-title">{title}</h2>
        </div>
        {onViewAll && (
          <button className="lr-view-all" onClick={onViewAll}>
            View all{count ? ` ${count}` : ''} <span aria-hidden="true">→</span>
          </button>
        )}
      </header>

      <div className="lr-wrap">
        <div className="lr-scroll" ref={ref} onScroll={sync}>
          {children}
          {/* Spacer so the last card can scroll clear of the right-hand arrow
              instead of sitting underneath it. */}
          <div className="lr-tail" aria-hidden="true" />
        </div>

        <button
          className={`lr-arrow lr-arrow-prev ${atStart ? 'hidden' : ''}`}
          onClick={() => scroll(-1)}
          aria-label={`Scroll ${title} back`}
          tabIndex={atStart ? -1 : 0}
        >‹</button>
        <button
          className={`lr-arrow lr-arrow-next ${atEnd ? 'hidden' : ''}`}
          onClick={() => scroll(1)}
          aria-label={`Scroll ${title} forward`}
          tabIndex={atEnd ? -1 : 0}
        >›</button>
      </div>
    </section>
  )
}
