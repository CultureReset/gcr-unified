// /concierge — the web concierge. Questions go to gcr-api-clean, which answers
// with the public MCP (the same tools the concierge number uses). The places
// it recommends are shown from their own records and can be turned into a
// shareable results page (/r/c/:code).

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BRAND, API_BASE, siteUrl } from '../config'
import { conciergeChat, createResults, fetchEntity } from '../services/publicApi'
import { authFetch } from '../context/AppContext'
import AskPanel from '../components/public/AskPanel'
import PlaceCard from '../components/public/PlaceCard'
import PageMeta from '../components/public/PageMeta'
import { ErrorState } from '../components/public/States'
import { websiteJsonLd } from '../utils/schemaOrg'
import '../components/public/public.css'

// The public route first; a signed-in visitor can fall back to the tourist
// chat, which runs on the same concierge tools.
async function send({ message, conversationId }) {
  try {
    return await conciergeChat({ message, conversationId })
  } catch (err) {
    if (!err?.notConnected || !localStorage.getItem('gcr_access_token')) throw err
    const res = await authFetch(`${API_BASE}/api/tourist/ai-chat`, {
      method: 'POST',
      body: JSON.stringify({ message, conversation_id: conversationId || undefined }),
    })
    if (!res.ok) throw err
    const d = await res.json()
    return { reply: d.reply, conversationId: d.conversation_id }
  }
}

export default function Concierge() {
  const navigate = useNavigate()
  const name = BRAND.conciergeName || 'Concierge'
  const [places, setPlaces] = useState([])
  const [question, setQuestion] = useState('')
  const [conversationId, setConversationId] = useState(null)
  const [sharing, setSharing] = useState({ busy: false, error: null })

  async function onPlaces(list, res) {
    if (res?.resultsCode) { navigate(`/r/c/${encodeURIComponent(res.resultsCode)}`); return }
    const rows = await Promise.all(list.slice(0, 6).map(async p => {
      try { return { ...(await fetchEntity(p.slug)), why: p.why || p.reason || '' } } catch { return null }
    }))
    setPlaces(rows.filter(Boolean))
  }

  async function share() {
    setSharing({ busy: true, error: null })
    try {
      const out = await createResults({ kind: 'results', title: question, conversationId, items: places.map(p => ({ slug: p.slug, why: p.why || undefined })) })
      navigate(`/r/c/${encodeURIComponent(out.code)}`)
    } catch (error) {
      setSharing({ busy: false, error })
    }
  }

  return (
    <main className="pl-page">
      <PageMeta title={name} canonical={siteUrl('/concierge')} jsonLd={websiteJsonLd({ name: BRAND.name, url: BRAND.siteUrl, searchPath: '/directory?q=' })} />
      <header className="pl-hero">
        {BRAND.regionLabel && <p className="pl-eyebrow">{BRAND.regionLabel}</p>}
        <h1 className="pl-h1">{name}</h1>
        <p className="pl-muted">Say what you're after — who, when, how many — and get places that fit, from what businesses have published.</p>
      </header>

      <AskPanel
        placeholder="What are you looking for?"
        starters={BRAND.conciergeStarters}
        send={async (args) => { if (!question) setQuestion(args.message); return send(args) }}
        onConversation={setConversationId}
        onPlaces={onPlaces}
        unavailable={
          <>
            <p className="pl-state-title">The web concierge isn't switched on yet</p>
            {BRAND.conciergeNumber
              ? <p className="pl-state-body">You can text it instead: <a href={`sms:${BRAND.conciergeNumber}`}>{BRAND.conciergeNumber}</a></p>
              : <p className="pl-state-body">Meanwhile, search the directory.</p>}
          </>
        }
      />

      {places.length > 0 && (
        <section className="pl-section" aria-label="Suggested places">
          <h2 className="pl-h2">Suggested places</h2>
          <div className="pl-cards">
            {places.map((p, i) => <PlaceCard key={p.slug} business={p} rank={i + 1} why={p.why} />)}
          </div>
          <div className="pl-row">
            <button type="button" className="pl-btn pl-btn--primary" disabled={sharing.busy} onClick={share}>
              {sharing.busy ? 'Making a link…' : 'Make a shareable page'}
            </button>
          </div>
          {sharing.error && <ErrorState error={sharing.error} title={sharing.error.notConnected ? 'Sharing is not switched on yet' : 'Could not make the link'} />}
        </section>
      )}
    </main>
  )
}
