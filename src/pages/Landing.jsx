import { useNavigate } from 'react-router-dom'
import './Landing.css'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="landing-page">
      {/* HEADER - Same as launching-GCR */}
      <header className="gcr-header">
        <div className="gcr-header-top">
          <a href="#" className="gcr-logo-row" onClick={() => navigate('/')}>
            <div className="gcr-logo-circle">🌊</div>
            <div className="gcr-logo-text">GULF<span>COAST</span>RADAR</div>
          </a>
        </div>

        <div className="gcr-cat-tabs">
          <a href="#" onClick={() => navigate('/browse')} className="gcr-cat-tab">🍽️ Restaurants</a>
          <a href="#" onClick={() => navigate('/browse')} className="gcr-cat-tab">☕ Coffee & Sweets</a>
          <a href="#" onClick={() => navigate('/browse')} className="gcr-cat-tab">🍻 Happy Hours</a>
          <a href="#" onClick={() => navigate('/browse')} className="gcr-cat-tab">🎉 Events</a>
          <a href="#" onClick={() => navigate('/browse')} className="gcr-cat-tab">🎯 Things To Do</a>
          <a href="#" onClick={() => navigate('/browse')} className="gcr-cat-tab">🛠️ Services</a>
          <a href="#" onClick={() => navigate('/browse')} className="gcr-cat-tab">✨ Public Spots</a>
          <a href="#" onClick={() => navigate('/browse')} className="gcr-cat-tab">🛍️ Shopping</a>
          <a href="#" onClick={() => navigate('/browse')} className="gcr-cat-tab">🏨 Staying</a>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="landing-hero">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80"
          alt="Beach"
          className="hero-img"
        />
        <div className="hero-overlay" />

        <div className="hero-content">
          <h1>Discover Orange Beach & Gulf Shores</h1>
          <p>Restaurants, hotels, activities, and experiences all in one place.</p>

          <div className="action-buttons">
            <button className="btn-primary" onClick={() => navigate('/category/restaurants')}>
              🔍 Search & Browse
            </button>
            <button className="btn-secondary" onClick={() => navigate('/swipe/restaurants')}>
              👆 Swipe Mode
            </button>
            <button className="btn-tertiary" onClick={() => navigate('/auth')}>
              📱 Sign In / Sign Up
            </button>
          </div>
        </div>
      </section>

      {/* ACTION STRIP */}
      <section className="gcr-action-strip">
        <button className="gcr-strip-btn gcr-strip-gold" onClick={() => navigate('/auth')}>
          ⭐ Join Our Loyalty Program 🎁
        </button>
        <button className="gcr-strip-btn gcr-strip-teal" onClick={() => navigate('/browse')}>
          📅 Explore Categories 🎉
        </button>
      </section>

      {/* FEATURES */}
      <section className="landing-features">
        <div className="feature-card">
          <div className="feature-icon">🍽️</div>
          <h3>Browse Everything</h3>
          <p>Restaurants, hotels, events, and more</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">👆</div>
          <h3>Swipe to Discover</h3>
          <p>Find what you love with our card-based interface</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📱</div>
          <h3>Save & Plan</h3>
          <p>Build your perfect trip itinerary</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">Gulf<span>Coast</span>Radar</div>
            <p>The local search engine for Orange Beach, Gulf Shores & the Alabama Gulf Coast.</p>
          </div>
          <div className="footer-links">
            <h5>Quick Links</h5>
            <a href="#" onClick={() => navigate('/browse')}>Browse</a>
            <a href="#" onClick={() => navigate('/auth')}>Sign In</a>
            <a href="#">About</a>
            <a href="#">Privacy</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Gulf Coast Radar. Orange Beach · Gulf Shores, AL</p>
        </div>
      </footer>
    </div>
  )
}
