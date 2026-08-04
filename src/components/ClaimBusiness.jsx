import { useEffect, useState } from 'react'
import { API_BASE } from '../config'
import './ClaimBusiness.css'

// "Is this your business?" — on every profile page.
//
// The button already knows which listing the visitor is looking at, so the
// claim carries the slug. That is the whole point: an admin opening the lead
// sees the business it is about instead of matching a typed name back to one
// of four thousand listings.
//
// Submitting grants nothing. It writes a business_claims row with status
// 'new', which lands in the admin dashboard's Claims screen; linking the
// account to the listing is a separate, deliberate step there.

const EMPTY = { contact_name: '', phone: '', email: '', role: '', message: '' }

export default function ClaimBusiness({ slug, businessName }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  // Escape closes, and the page behind must not scroll while the form is up.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open])

  function change(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/gcr/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_slug: slug,
          business_name: businessName,
          contact_name: form.contact_name,
          phone: form.phone,
          email: form.email,
          // role isn't a column on business_claims; it belongs with the note
          // so the admin still sees who is asking and in what capacity.
          message: [form.role && `Role: ${form.role}`, form.message]
            .filter(Boolean)
            .join(' — '),
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || `Could not send that (${res.status}).`)
      setSent(true)
      setForm(EMPTY)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function close() {
    setOpen(false)
    // Reset only after the panel is gone, so it doesn't flicker back to the
    // form on the way out.
    setTimeout(() => { setSent(false); setError('') }, 200)
  }

  if (!slug) return null

  return (
    <>
      <div className="sidebar-card claim-card">
        <h3 className="sidebar-title">Is this your business?</h3>
        <p className="claim-pitch">
          Claim {businessName || 'this listing'} to update your hours, menu, photos and more.
        </p>
        <button type="button" className="sidebar-btn claim-cta" onClick={() => setOpen(true)}>
          ✋ Claim this business
        </button>
      </div>

      {open && (
        // Own overlay classes rather than the page's .modal-overlay, which is
        // display:none until an .open class is added. Self-contained means this
        // component drops onto any page without inheriting that.
        <div className="claim-overlay" onClick={close} role="presentation">
          <div
            className="claim-box"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Claim ${businessName || 'this business'}`}
          >
            <button className="claim-close" onClick={close} aria-label="Close">✕</button>

            {sent ? (
              <div className="claim-done">
                <h2>Request sent</h2>
                <p>
                  Thanks — we have your request for <strong>{businessName || slug}</strong>.
                  Someone will get in touch to verify you own it, and then you&apos;ll get a
                  login to manage the listing.
                </p>
                <button type="button" className="claim-submit" onClick={close}>Done</button>
              </div>
            ) : (
              <form className="claim-form" onSubmit={submit}>
                <h2>Claim {businessName || 'this business'}</h2>
                <p className="claim-pitch">
                  Tell us how to reach you. We verify every claim before handing over access.
                </p>

                <label>
                  Your name
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => change('contact_name', e.target.value)}
                    autoComplete="name"
                    required
                  />
                </label>

                <label>
                  Phone
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => change('phone', e.target.value)}
                    autoComplete="tel"
                    required
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => change('email', e.target.value)}
                    autoComplete="email"
                  />
                </label>

                <label>
                  Your role
                  <input
                    type="text"
                    value={form.role}
                    onChange={(e) => change('role', e.target.value)}
                    placeholder="Owner, manager, marketing…"
                  />
                </label>

                <label>
                  Anything else
                  <textarea
                    rows={3}
                    value={form.message}
                    onChange={(e) => change('message', e.target.value)}
                    placeholder="Optional"
                  />
                </label>

                {error && <p className="claim-error">{error}</p>}

                <button type="submit" className="claim-submit" disabled={busy}>
                  {busy ? 'Sending…' : 'Send request'}
                </button>
                <p className="claim-fineprint">
                  Sending this doesn&apos;t change the listing. We&apos;ll verify first.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
