// A question-and-answer panel. The answers come from gcr-api-clean (which
// answers with the public MCP); the browser never holds a model or data key.
// `send({ message, conversationId })` resolves { reply, conversationId, places? }.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const INLINE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g

// Replies may carry **bold** and [name](/business/slug) links; drawn as React
// elements, never as HTML.
function renderInline(text, keyBase) {
  const out = []
  let last = 0
  let m
  INLINE.lastIndex = 0
  while ((m = INLINE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = `${keyBase}-${m.index}`
    if (m[1]) out.push(<strong key={key}>{m[1]}</strong>)
    else if (m[3].startsWith('/')) out.push(<Link key={key} to={m[3]}>{m[2]}</Link>)
    else if (/^https?:\/\//.test(m[3])) out.push(<a key={key} href={m[3]} target="_blank" rel="noopener noreferrer">{m[2]}</a>)
    else out.push(m[2])
    last = INLINE.lastIndex
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function Reply({ text }) {
  return String(text || '').trim().split('\n').map((line, i) =>
    line.trim() ? <p key={i}>{renderInline(line.replace(/^\s*[-*]\s+/, '• '), i)}</p> : null)
}

export default function AskPanel({ title, intro, placeholder = 'Type a question', starters = [], send, onPlaces, onConversation, unavailable, footer }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [conversationId, setConversationId] = useState(null)
  const [offline, setOffline] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView?.({ block: 'nearest' }) }, [messages, busy])

  async function ask(text) {
    const message = String(text || '').trim()
    if (!message || busy) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: message }])
    setBusy(true)
    try {
      const res = await send({ message, conversationId })
      if (res?.conversationId) { setConversationId(res.conversationId); onConversation?.(res.conversationId) }
      setMessages(m => [...m, { role: 'agent', text: res?.reply || 'No answer came back. Try asking another way.' }])
      if (Array.isArray(res?.places) && res.places.length) onPlaces?.(res.places, res)
    } catch (err) {
      if (err?.notConnected) {
        setOffline(true)
        setMessages(m => m.slice(0, -1))
      } else {
        setMessages(m => [...m, { role: 'error', text: err?.message || 'That did not go through. Try again.' }])
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="pl-ask" aria-label={title}>
      {title && <h2 className="pl-ask-title">{title}</h2>}
      {intro && <p className="pl-muted">{intro}</p>}
      {offline ? (
        <div className="pl-state pl-empty">{unavailable || <p className="pl-state-body">Questions are not switched on here yet.</p>}</div>
      ) : (
        <>
          <div className="pl-ask-log" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`pl-msg pl-msg--${m.role}`}><Reply text={m.text} /></div>
            ))}
            {busy && <div className="pl-msg pl-msg--agent pl-typing" aria-label="Answering">…</div>}
            <div ref={endRef} />
          </div>
          {!messages.length && starters.length > 0 && (
            <div className="pl-chips">
              {starters.map(s => <button key={s} type="button" className="pl-chip" onClick={() => ask(s)}>{s}</button>)}
            </div>
          )}
          <form className="pl-ask-form" onSubmit={e => { e.preventDefault(); ask(input) }}>
            <label className="pl-sr" htmlFor={`ask-${title || 'q'}`}>{placeholder}</label>
            <input id={`ask-${title || 'q'}`} value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder} maxLength={1000} disabled={busy} />
            <button type="submit" className="pl-btn pl-btn--primary" disabled={busy || !input.trim()}>Ask</button>
          </form>
        </>
      )}
      {footer}
    </section>
  )
}
