import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './ServiceListings.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'https://gcr-api-clean.vercel.app'

export default function ServiceListings() {
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredServices, setFilteredServices] = useState([])

  useEffect(() => {
    async function loadServices() {
      try {
        setLoading(true)
        const res = await fetch(`${API_BASE}/api/services`)
        if (!res.ok) throw new Error('Failed to load services')
        const data = await res.json()
        setServices(Array.isArray(data) ? data : [])
        setFilteredServices(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error loading services:', err)
        setServices([])
      } finally {
        setLoading(false)
      }
    }
    loadServices()
  }, [])

  useEffect(() => {
    const filtered = services.filter(service =>
      service.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredServices(filtered)
  }, [searchTerm, services])

  if (loading) return <div className="service-listings-loading">Loading services...</div>

  return (
    <div className="service-listings">
      <div className="service-hero">
        <h1>🛠️ Local Services</h1>
        <p>Book reliable local professionals</p>
      </div>

      <div className="service-container">
        <div className="service-search">
          <input
            type="text"
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {filteredServices.length === 0 ? (
          <div className="no-services">No services available</div>
        ) : (
          <div className="services-grid">
            {filteredServices.map((service) => (
              <div key={service.id} className="service-card">
                {service.photo_urls?.[0] && (
                  <img src={service.photo_urls[0]} alt={service.name} className="service-image" />
                )}
                <div className="service-info">
                  <h3>{service.name}</h3>
                  {service.description && (
                    <p className="description">{service.description.slice(0, 80)}...</p>
                  )}
                  {service.nightly_price && (
                    <p className="price">${service.nightly_price}</p>
                  )}
                  {service.amenities?.length > 0 && (
                    <div className="tags">
                      {service.amenities.slice(0, 2).map((tag, idx) => (
                        <span key={idx} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                  <button
                    className="view-btn"
                    onClick={() => navigate(`/service/${service.slug}`)}
                  >
                    View Service
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
