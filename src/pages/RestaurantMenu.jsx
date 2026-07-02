import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { API_BASE } from '../config';
import './RestaurantMenu.css';
import SongRequestForm from '../components/SongRequestForm';

export default function RestaurantMenu() {
  const { slug } = useParams();
  const [menu, setMenu] = useState(null);
  const [activeTab, setActiveTab] = useState('menu');
  const [userPhone, setUserPhone] = useState(null);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestType, setRequestType] = useState('song');
  const [requestTargetId, setRequestTargetId] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/public/menu?slug=${slug}`);
        if (!res.ok) throw new Error('Menu not found');
        const data = await res.json();
        setMenu(data);
      } catch (err) {
        console.error('Error loading menu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();

    // Check if phone is stored in session
    const stored = sessionStorage.getItem(`menu_phone_${slug}`);
    if (stored) setUserPhone(stored);
  }, [slug]);

  if (loading) return <div className="menu-loading">Loading menu...</div>;
  if (!menu) return <div className="menu-error">Menu not found</div>;

  const handlePhoneSubmit = (phone) => {
    setUserPhone(phone);
    sessionStorage.setItem(`menu_phone_${slug}`, phone);
    setShowPhonePrompt(false);
  };

  const handleRequestClick = (type, targetId = null) => {
    setRequestType(type);
    setRequestTargetId(targetId);
    setShowRequestForm(true);
    if (!userPhone) {
      setShowPhonePrompt(true);
    }
  };

  return (
    <div className="restaurant-menu">
      {/* Header */}
      <div className="menu-header">
        {menu.logo_url && <img src={menu.logo_url} alt={menu.business_name} className="menu-logo" />}
        <h1>{menu.business_name}</h1>
        {menu.tagline && <p className="menu-tagline">{menu.tagline}</p>}
      </div>

      {/* Tabs */}
      <div className="menu-tabs">
        <button
          className={`tab ${activeTab === 'menu' ? 'active' : ''}`}
          onClick={() => setActiveTab('menu')}
        >
          🍽️ Menu
        </button>
        {menu.live_artist && (
          <button
            className={`tab ${activeTab === 'live-music' ? 'active' : ''}`}
            onClick={() => setActiveTab('live-music')}
          >
            🎵 Live Music
          </button>
        )}
        {menu.events && menu.events.length > 0 && (
          <button
            className={`tab ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            📅 Events
          </button>
        )}
        {menu.specials && menu.specials.length > 0 && (
          <button
            className={`tab ${activeTab === 'specials' ? 'active' : ''}`}
            onClick={() => setActiveTab('specials')}
          >
            ⭐ Specials
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="menu-content">
        {activeTab === 'menu' && (
          <div className="menu-items">
            {menu.menu && menu.menu.length > 0 ? (
              menu.menu.map((section, idx) => (
                <div key={idx} className="menu-section">
                  <h2>{section.category}</h2>
                  <div className="items-grid">
                    {section.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="menu-item">
                        {item.image_url && <img src={item.image_url} alt={item.name} />}
                        <h3>{item.name}</h3>
                        {item.description && <p className="item-desc">{item.description}</p>}
                        <div className="item-footer">
                          <span className="price">${item.price.toFixed(2)}</span>
                          <button className="add-btn">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p>No menu items available</p>
            )}
          </div>
        )}

        {activeTab === 'live-music' && menu.live_artist && (
          <div className="live-music-tab">
            <div className="artist-card">
              {menu.live_artist.photo_url && (
                <img src={menu.live_artist.photo_url} alt={menu.live_artist.artist_name} className="artist-photo" />
              )}
              <h2>{menu.live_artist.artist_name}</h2>
              {menu.live_artist.bio && <p className="artist-bio">{menu.live_artist.bio}</p>}

              <div className="artist-action-buttons">
                {menu.live_artist.request_enabled && (
                  <button className="btn-primary" onClick={() => handleRequestClick('song')}>
                    🎸 Request a Song
                  </button>
                )}
                {menu.live_artist.shoutout_enabled && (
                  <button className="btn-secondary" onClick={() => handleRequestClick('shoutout')}>
                    📢 Send Shoutout
                  </button>
                )}
                {menu.live_artist.cashtag || menu.live_artist.venmo ? (
                  <button className="btn-accent" onClick={() => handleRequestClick('tip')}>
                    💰 Tip Artist
                  </button>
                ) : null}
              </div>

              {/* Contact Links */}
              <div className="artist-links">
                {menu.live_artist.cashtag && (
                  <span className="artist-link">💵 ${menu.live_artist.cashtag}</span>
                )}
                {menu.live_artist.venmo && (
                  <span className="artist-link">🔵 @{menu.live_artist.venmo}</span>
                )}
                {menu.live_artist.instagram_url && (
                  <a href={menu.live_artist.instagram_url} target="_blank" rel="noopener noreferrer" className="artist-link">
                    📸 Instagram
                  </a>
                )}
              </div>
            </div>

            {/* Cooperatives */}
            {menu.live_artist.cooperatives && menu.live_artist.cooperatives.length > 0 && (
              <div className="cooperatives-section">
                <h3>🎵 Group Song Requests</h3>
                {menu.live_artist.cooperatives.map((coop) => (
                  <div key={coop.id} className="coop-card">
                    <h4>{coop.song_title}</h4>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min((coop.current_amount / coop.target_amount) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="progress-text">
                      ${coop.current_amount.toFixed(2)} / ${coop.target_amount.toFixed(2)} ({coop.num_contributors} supporters)
                    </p>
                    <button className="btn-small" onClick={() => handleRequestClick('coop', coop.id)}>
                      Add $5
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Goals */}
            {menu.live_artist.goals && menu.live_artist.goals.length > 0 && (
              <div className="goals-section">
                <h3>🎯 Artist Goals</h3>
                {menu.live_artist.goals.map((goal) => (
                  <div key={goal.id} className="goal-card">
                    <h4>{goal.goal_name}</h4>
                    {goal.description && <p className="goal-desc">{goal.description}</p>}
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="progress-text">
                      ${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)} ({goal.num_contributors} supporters)
                    </p>
                    <button className="btn-small" onClick={() => handleRequestClick('goal', goal.id)}>
                      Donate
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <div className="events-list">
            {menu.events && menu.events.length > 0 ? (
              menu.events.map((event, idx) => (
                <div key={idx} className="event-card">
                  <h3>{event.event_name}</h3>
                  {event.description && <p>{event.description}</p>}
                  {event.event_date && <p className="event-date">📅 {event.event_date}</p>}
                </div>
              ))
            ) : (
              <p>No upcoming events</p>
            )}
          </div>
        )}

        {activeTab === 'specials' && (
          <div className="specials-list">
            {menu.specials && menu.specials.length > 0 ? (
              menu.specials.map((special, idx) => (
                <div key={idx} className="special-card">
                  <h3>{special.name}</h3>
                  {special.description && <p>{special.description}</p>}
                  {special.price && <span className="price">${special.price}</span>}
                </div>
              ))
            ) : (
              <p>No specials available</p>
            )}
          </div>
        )}
      </div>

      {/* Phone Prompt Modal */}
      {showPhonePrompt && (
        <PhonePrompt
          onSubmit={handlePhoneSubmit}
          onClose={() => setShowPhonePrompt(false)}
        />
      )}

      {/* Request Form Modal */}
      {showRequestForm && menu.live_artist && (
        <SongRequestForm
          artist={menu.live_artist}
          requestType={requestType}
          targetId={requestTargetId}
          userPhone={userPhone}
          slug={slug}
          onClose={() => setShowRequestForm(false)}
        />
      )}
    </div>
  );
}

function PhonePrompt({ onSubmit, onClose }) {
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (phone.trim()) {
      onSubmit(phone);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Get SMS Updates</h2>
        <p>Enter your phone number to receive updates about your request.</p>
        <form onSubmit={handleSubmit}>
          <input
            type="tel"
            placeholder="555-123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
          />
          <div className="modal-buttons">
            <button type="submit" className="btn-primary">
              Continue
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Skip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
