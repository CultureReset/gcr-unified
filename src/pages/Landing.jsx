import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { DEFAULT_MODE } from '../config'
import './Landing.css'

export default function Landing() {
  const navigate = useNavigate()
  const { tourist } = useApp()

  useEffect(() => {
    if (DEFAULT_MODE === 'browse') {
      navigate('/browse', { replace: true })
    }
  }, [])

  return (
    <div className="landing">
      <div className="landing-bg">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80"
          alt="Beach"
          className="landing-img"
        />
        <div className="landing-overlay" />
      </div>

      <div className="landing-content">
        <div className="landing-logo">
          <span>Gulf Coast Radar</span>
        </div>

        <div className="landing-hero">
          <h1>Swipe, Plan &<br />Explore the<br /><span className="gradient-text">Gulf Coast</span></h1>
          <p>Discover the best restaurants, activities, and experiences — built around what YOU love.</p>
        </div>

        <div className="landing-features">
          {['Swipe to discover', 'Plan your trip'].map(f => (
            <div key={f} className="landing-feature">
              <div className="feature-dot" />
              <span>{f}</span>
            </div>
          ))}
        </div>

        <div className="landing-actions">
          <button className="btn-primary" onClick={() => navigate('/auth')}>
            Get Started — It's Free
          </button>
          {tourist?.setupComplete && (
            <button className="btn-outline" onClick={() => navigate('/home')}>
              Continue My Trip
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
