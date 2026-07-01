import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE } from '../config'
import './ArtistLive.css'

const AMOUNTS = [5, 10, 20, 50]

export default function ArtistLive() {
  const { slug } = useParams()
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [screen, setScreen]   = useState('home') // home | request | shoutout | tip
  const [amount, setAmount]   = useState(10)
  const [song, setSong]       = useState('')
  const [name, setName]       = useState('')
  const [msg, setMsg]         = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/api/gcr/artist/${slug}/live`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  if (loading) return (
    <div className="al-loading">
      <div className="al-spinner" />
    </div>
  )

  if (!data?.artist) return (
    <div className="al-loading">
      <div style={{ fontSize: 48 }}>🎵</div>
      <p>Artist not found</p>
    </div>
  )

  const { artist, show } = data

  // Cash App and Venmo deep links
  function openCashApp() {
    const handle = artist.cashapp?.replace(/^\$/, '')
    if (!handle) return
    logRequest()
    window.open(`https://cash.app/$${handle}/${amount}`, '_blank')
  }

  function openVenmo() {
    const handle = artist.venmo?.replace(/^@/, '')
    if (!handle) return
    logRequest()
    window.open(`https://venmo.com/${handle}?txn=pay&amount=${amount}&note=${encodeURIComponent(song || msg || 'Tip')}`, '_blank')
  }

  async function logRequest() {
    try {
      await fetch(`${API_BASE}/api/gcr/artist/${slug}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song, name, message: msg, amount, type: screen })
      })
    } catch {}
  }

  // HOME SCREEN — three big buttons
  if (screen === 'home') return (
    <div className="al-page">
      <div
        className="al-hero"
        style={{ backgroundImage: artist.photo_url ? `url(${artist.photo_url})` : undefined }}
      >
        <div className="al-hero-overlay" />
        <div className="al-hero-content">
          {show && (
            <div className="al-live-badge">
              <span className="al-dot" />
              LIVE NOW
            </div>
          )}
          <div className="al-artist-name">{artist.name}</div>
          {show && (
            <div className="al-venue">{show.venue}</div>
          )}
        </div>
      </div>

      <div className="al-actions">
        {artist.request_enabled && (
          <button className="al-action-btn al-action-request" onClick={() => setScreen('request')}>
            <span className="al-action-icon">🎵</span>
            <span className="al-action-label">Request a Song</span>
            <span className="al-action-arrow">›</span>
          </button>
        )}
        {artist.shoutout_enabled && (
          <button className="al-action-btn al-action-shoutout" onClick={() => setScreen('shoutout')}>
            <span className="al-action-icon">📢</span>
            <span className="al-action-label">Send a Shoutout</span>
            <span className="al-action-arrow">›</span>
          </button>
        )}
        <button className="al-action-btn al-action-tip" onClick={() => setScreen('tip')}>
          <span className="al-action-icon">💸</span>
          <span className="al-action-label">Tip the Artist</span>
          <span className="al-action-arrow">›</span>
        </button>
      </div>

      <div className="al-footer">
        Powered by CyberCheck • Gulf Coast Radar
      </div>
    </div>
  )

  // SHARED PAY SCREEN layout
  const screenConfig = {
    request:  { emoji: '🎵', title: 'Request a Song',   color: '#22c55e' },
    shoutout: { emoji: '📢', title: 'Send a Shoutout',  color: '#8b5cf6' },
    tip:      { emoji: '💸', title: 'Tip the Artist',   color: '#f59e0b' },
  }
  const cfg = screenConfig[screen]

  return (
    <div className="al-page al-pay-page">
      {/* Back */}
      <button className="al-back" onClick={() => setScreen('home')}>
        ← Back
      </button>

      {/* Artist name stays visible */}
      <div className="al-pay-artist">
        <span className="al-pay-emoji">{cfg.emoji}</span>
        <span>{artist.name}</span>
      </div>

      <div className="al-pay-title" style={{ color: cfg.color }}>
        {cfg.title}
      </div>

      {/* Song input — only for requests */}
      {screen === 'request' && (
        <div className="al-field-wrap">
          <div className="al-field-label">SONG</div>

          {/* Artist's song list if they have one */}
          {Array.isArray(artist.songs) && artist.songs.length > 0 ? (
            <div className="al-song-list">
              {artist.songs.map((s, i) => {
                const title = typeof s === 'string' ? s : s.title
                return (
                  <button
                    key={i}
                    className={`al-song-pill ${song === title ? 'al-song-active' : ''}`}
                    onClick={() => setSong(title)}
                  >
                    {title}
                  </button>
                )
              })}
            </div>
          ) : null}

          <input
            className="al-input"
            placeholder="Song name"
            value={song}
            onChange={e => setSong(e.target.value)}
          />
        </div>
      )}

      {/* Shoutout message */}
      {screen === 'shoutout' && (
        <div className="al-field-wrap">
          <div className="al-field-label">MESSAGE</div>
          <div className="al-shoutout-examples">
            {['Happy Birthday! 🎂', 'Happy Anniversary! 💍', 'Roll Tide! 🐘', 'Will you marry me? 💍'].map(ex => (
              <button key={ex} className="al-example-pill" onClick={() => setMsg(ex)}>
                {ex}
              </button>
            ))}
          </div>
          <textarea
            className="al-input al-textarea"
            placeholder="Type your shoutout..."
            value={msg}
            onChange={e => setMsg(e.target.value)}
          />
        </div>
      )}

      {/* Name — all screens */}
      <div className="al-field-wrap">
        <div className="al-field-label">YOUR NAME</div>
        <input
          className="al-input"
          placeholder="Table 12 or your name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      {/* Amount */}
      <div className="al-field-wrap">
        <div className="al-field-label">AMOUNT</div>
        <div className="al-amounts">
          {AMOUNTS.map(a => (
            <button
              key={a}
              className={`al-amount-btn ${amount === a ? 'al-amount-active' : ''}`}
              onClick={() => setAmount(a)}
            >
              ${a}
            </button>
          ))}
        </div>
      </div>

      {/* Pay buttons */}
      <div className="al-pay-buttons">
        {artist.cashapp && (
          <button className="al-pay-btn al-cashapp" onClick={openCashApp}>
            <span className="al-pay-app-name">Cash App</span>
            <span className="al-pay-amount">${amount}</span>
          </button>
        )}
        {artist.venmo && (
          <button className="al-pay-btn al-venmo" onClick={openVenmo}>
            <span className="al-pay-app-name">Venmo</span>
            <span className="al-pay-amount">${amount}</span>
          </button>
        )}
      </div>

      <div className="al-pay-note">
        Tap a button to open the app. Pay {artist.name} directly — no fees.
      </div>
    </div>
  )
}
