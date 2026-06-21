import { useParams, useNavigate } from 'react-router-dom'
import './Confirmation.css'

export default function Confirmation() {
  const { type, id } = useParams()
  const navigate = useNavigate()

  const confirmationData = {
    rental: {
      title: 'Rental Booking Confirmed!',
      subtitle: 'Your reservation has been submitted',
      status: 'Pending Payment',
      nextStep: 'Complete payment to secure your reservation',
      messages: [
        '📧 A confirmation email has been sent to your email address',
        '💬 You can message the property owner with any questions',
        '📅 Check your email for check-in details',
      ],
      buttons: [
        { label: 'Back to Rentals', path: '/staying' },
        { label: 'View My Bookings', path: '/my-bookings' },
      ],
    },
    service: {
      title: 'Service Booking Confirmed!',
      subtitle: 'Your booking request has been sent',
      status: 'Awaiting Confirmation',
      nextStep: 'Service provider will confirm your booking',
      messages: [
        '📧 Confirmation details sent to your email',
        '💬 You can message the service provider directly',
        '⏰ You\'ll be notified when they confirm your booking',
      ],
      buttons: [
        { label: 'Back to Services', path: '/services' },
        { label: 'View My Bookings', path: '/my-bookings' },
      ],
    },
  }

  const data = confirmationData[type] || confirmationData.rental

  return (
    <div className="confirmation">
      <div className="confirmation-container">
        <div className="success-icon">✓</div>
        <h1>{data.title}</h1>
        <p className="subtitle">{data.subtitle}</p>

        <div className="confirmation-details">
          <div className="detail-row">
            <span>Booking ID:</span>
            <span className="value">{id}</span>
          </div>
          <div className="detail-row">
            <span>Status:</span>
            <span className="value">{data.status}</span>
          </div>
          <div className="detail-row">
            <span>Next Step:</span>
            <span className="value">{data.nextStep}</span>
          </div>
        </div>

        <div className="confirmation-message">
          {data.messages.map((msg, idx) => (
            <p key={idx}>{msg}</p>
          ))}
        </div>

        <div className="confirmation-actions">
          {data.buttons.map((btn, idx) => (
            <button
              key={idx}
              className={idx === 0 ? 'primary-btn' : 'secondary-btn'}
              onClick={() => navigate(btn.path)}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
