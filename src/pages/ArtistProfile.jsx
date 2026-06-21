import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './ArtistProfile.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://gcr-api-clean.vercel.app'

export default function ArtistProfile() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [artist, setArtist] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadArtist() {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/api/artists/${slug}`)
        if (!res.ok) throw new Error('Artist not found')
        const data = await res.json()
        setArtist(data)
      } catch (err) {
        console.error('Error loading artist:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadArtist()
  }, [slug])

  if (loading) return <div className="artist-profile-loading">Loading artist profile...</div>
  if (error) return <div className="artist-profile-error">{error}</div>
  if (!artist) return <div className="artist-profile-error">Artist not found</div>

  return (
    <div className="artist-profile">
      {/* Hero Section */}
      <div className="artist-hero">
        {artist.photo_url && (
          <img src={artist.photo_url} alt={artist.artist_name} className="artist-hero-image" />
        )}
        <div className="artist-hero-overlay">
          <h1>{artist.artist_name}</h1>
        </div>
      </div>

      <div className="artist-profile-content">
        {/* Genre / Hometown */}
        {(artist.genre || artist.hometown) && (
          <div className="artist-meta-row">
            {artist.genre && <span className="artist-genre">🎵 {artist.genre}</span>}
            {artist.hometown && <span className="artist-hometown">📍 {artist.hometown}</span>}
          </div>
        )}

        {/* Bio */}
        {artist.bio && (
          <section className="section">
            <h2>About</h2>
            <p className="bio">{artist.bio}</p>
          </section>
        )}

        {/* Songs */}
        {artist.songs && artist.songs.length > 0 && (
          <section className="section">
            <h2>🎵 Song List ({artist.songs.length})</h2>
            <div className="songs-grid">
              {artist.songs.map((song, idx) => (
                <div key={idx} className="song-card">
                  <div className="song-title">{song.title}</div>
                  <div className="song-artist">{song.artist}</div>
                  {song.price && <div className="song-price">${song.price}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Events */}
        {artist.events && artist.events.length > 0 && (
          <section className="section">
            <h2>📅 Upcoming Events</h2>
            <div className="events-list">
              {artist.events.map((event, idx) => (
                <div key={idx} className="event-item">
                  <div className="event-date">{event.date}</div>
                  <div className="event-venue">{event.venue_name}</div>
                  {event.time && <div className="event-time">{event.time}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contact & Links */}
        <section className="section contact-section">
          <h2>Get in Touch</h2>
          <div className="contact-grid">
            {artist.venmo && (
              <a href={`https://venmo.com/${artist.venmo}`} target="_blank" rel="noopener noreferrer" className="contact-btn venmo">
                💜 Venmo: @{artist.venmo}
              </a>
            )}
            {artist.cashtag && (
              <a href={`https://cash.app/$${artist.cashtag}`} target="_blank" rel="noopener noreferrer" className="contact-btn cashapp">
                💵 CashApp: ${artist.cashtag}
              </a>
            )}
            {artist.instagram_url && (
              <a href={artist.instagram_url} target="_blank" rel="noopener noreferrer" className="contact-btn instagram">
                📸 Instagram
              </a>
            )}
            {artist.spotify_url && (
              <a href={artist.spotify_url} target="_blank" rel="noopener noreferrer" className="contact-btn spotify">
                🎵 Spotify
              </a>
            )}
            {artist.youtube_url && (
              <a href={artist.youtube_url} target="_blank" rel="noopener noreferrer" className="contact-btn youtube">
                ▶️ YouTube
              </a>
            )}
            {artist.booking_url && (
              <a href={artist.booking_url} target="_blank" rel="noopener noreferrer" className="contact-btn booking">
                📅 Book Me
              </a>
            )}
          </div>
        </section>

        {/* Action Buttons */}
        <section className="section action-buttons">
          <button className="btn btn-primary" onClick={() => navigate('/artists')}>
            ← Back to Artists
          </button>
        </section>
      </div>
    </div>
  )
}
