import { useState, useEffect } from 'react';
import Toast from './Toast';
import './SongRequestForm.css';

export default function SongRequestForm({ artist, requestType, userPhone, slug, onClose }) {
  const [formData, setFormData] = useState({
    fan_name: '',
    song_title: '',
    note: '',
    amount: artist.default_min_request_amount || 5,
  });
  const [reqCode, setReqCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showPaymentInstructions, setShowPaymentInstructions] = useState(false);

  useEffect(() => {
    if (requestType === 'coop' || requestType === 'goal') {
      setFormData((prev) => ({ ...prev, amount: 10 }));
    }
  }, [requestType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let endpoint = '';
      let payload = {
        fan_name: formData.fan_name,
        fan_phone: userPhone || null,
        amount: formData.amount,
        site_id: slug,
      };

      if (requestType === 'song' || requestType === 'shoutout') {
        endpoint = `/api/artists/${artist.slug}/request`;
        payload.song_title = formData.song_title;
        payload.note = formData.note;
        payload.request_type = requestType;
      } else if (requestType === 'coop') {
        // Find the coop from artist data (simplified for now)
        endpoint = `/api/cooperatives/${artist.slug}/cooperatives/[id]/contribute`;
        payload.amount = formData.amount;
      } else if (requestType === 'goal') {
        endpoint = `/api/goals/${artist.slug}/goals/[id]/contribute`;
        payload.amount = formData.amount;
      } else if (requestType === 'tip') {
        endpoint = `/api/artists/${artist.slug}/request`;
        payload.song_title = `Tip for ${artist.artist_name}`;
        payload.request_type = 'tip';
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create request');
      const data = await res.json();
      setReqCode(data.req_code);
      setShowPaymentInstructions(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showPaymentInstructions) {
    return (
      <PaymentInstructions
        reqCode={reqCode}
        artist={artist}
        amount={formData.amount}
        requestType={requestType}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="modal-overlay">
      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
      <div className="modal-content song-request-modal">
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <h2>
          {requestType === 'song' && '🎸 Request a Song'}
          {requestType === 'shoutout' && '📢 Send Shoutout'}
          {requestType === 'tip' && '💰 Tip Artist'}
          {requestType === 'coop' && '🎵 Support Group Song'}
          {requestType === 'goal' && '🎯 Support Goal'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Name *</label>
            <input
              type="text"
              name="fan_name"
              placeholder="e.g., Mike"
              value={formData.fan_name}
              onChange={handleInputChange}
              required
            />
          </div>

          {(requestType === 'song' || requestType === 'shoutout') && (
            <>
              <div className="form-group">
                <label>
                  {requestType === 'song' ? 'Song Title *' : 'Shoutout Message *'}
                </label>
                <input
                  type="text"
                  name="song_title"
                  placeholder={requestType === 'song' ? 'e.g., Wagon Wheel' : 'e.g., Happy birthday Sarah!'}
                  value={formData.song_title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              {requestType === 'song' && (
                <div className="form-group">
                  <label>Note (Optional)</label>
                  <input
                    type="text"
                    name="note"
                    placeholder="e.g., For Sarah's birthday!"
                    value={formData.note}
                    onChange={handleInputChange}
                  />
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label>Amount ($) *</label>
            <input
              type="number"
              name="amount"
              min={artist.default_min_request_amount || 1}
              step="0.5"
              value={formData.amount}
              onChange={handleInputChange}
              required
            />
            <small>Min: ${artist.default_min_request_amount || 5}</small>
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : `Continue ($${formData.amount.toFixed(2)})`}
          </button>
        </form>

        <p className="form-note">💡 You'll get a payment code to share with the artist</p>
      </div>
    </div>
  );
}

function PaymentInstructions({ reqCode, artist, amount, requestType, onClose }) {
  const venmoUrl = artist.venmo ? `https://venmo.com/${artist.venmo}?txn=pay&amount=${amount}` : null;
  const cashappUrl = artist.cashtag ? `https://cash.app/$${artist.cashtag}/${amount}` : null;

  return (
    <div className="modal-overlay">
      <div className="modal-content payment-instructions">
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <h2>💳 Send Payment</h2>

        <div className="req-code-display">
          <p>Your Request Code:</p>
          <div className="code-box">
            <code>{reqCode}</code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(reqCode);
                setToast({ message: 'Code copied!', type: 'success' });
              }}
              className="copy-btn"
            >
              📋 Copy
            </button>
          </div>
        </div>

        <div className="instructions">
          <h3>How to Pay</h3>
          <p>Send ${amount.toFixed(2)} using one of the methods below.</p>
          <p>
            <strong>⚠️ Important:</strong> Put this code in the memo/message field:
            <br />
            <code>{reqCode}</code>
          </p>
        </div>

        <div className="payment-methods">
          {venmoUrl && (
            <a href={venmoUrl} target="_blank" rel="noopener noreferrer" className="btn-payment venmo">
              💜 Pay with Venmo
            </a>
          )}
          {cashappUrl && (
            <a href={cashappUrl} target="_blank" rel="noopener noreferrer" className="btn-payment cashapp">
              💵 Pay with Cash App
            </a>
          )}
        </div>

        <div className="next-steps">
          <h3>What Happens Next?</h3>
          <ol>
            <li>You'll be taken to the payment app</li>
            <li>Enter {amount.toFixed(2)} and put <code>{reqCode}</code> in the note</li>
            <li>Send the payment</li>
            <li>Come back here — your request will be confirmed</li>
            {artist.request_enabled && <li>Watch the live queue for your song</li>}
          </ol>
        </div>

        <button className="btn-primary" onClick={onClose}>
          ✓ I've Sent the Payment
        </button>
      </div>
    </div>
  );
}
