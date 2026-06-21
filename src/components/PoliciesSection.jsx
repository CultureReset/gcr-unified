import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

export default function PoliciesSection({ slug }) {
  const [policies, setPolicies] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPolicies()
  }, [slug])

  const loadPolicies = async () => {
    try {
      const types = ['cancellation', 'refund', 'house_rules', 'accessibility', 'pet_policy']
      const results = {}
      
      for (const type of types) {
        // Try to fetch from entity_policies table
        const res = await fetch(`${API_BASE}/api/faqs/${slug}?category=${type}`)
        if (res.ok) {
          const data = await res.json()
          if (data.faqs && data.faqs.length > 0) {
            results[type] = data.faqs[0]
          }
        }
      }
      
      setPolicies(results)
    } catch (err) {
      console.error('Error loading policies:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading">Loading policies...</div>

  const policyNames = {
    cancellation: 'Cancellation Policy',
    refund: 'Refund Policy',
    house_rules: 'House Rules',
    accessibility: 'Accessibility Information',
    pet_policy: 'Pet Policy'
  }

  return (
    <section className="content-section policies-section">
      <h2>📋 Policies & Information</h2>
      
      {Object.keys(policies).length === 0 ? (
        <p className="no-data">No policies available</p>
      ) : (
        <div className="policies-accordion">
          {Object.entries(policies).map(([type, policy]) => (
            <details key={type} className="policy-item">
              <summary>{policyNames[type]}</summary>
              <div className="policy-content">
                {policy.answer || policy.content}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  )
}
