import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

const POLICY_LABELS = {
  cancellation: 'Cancellation Policy',
  refund: 'Refund Policy',
  house_rules: 'House Rules',
  accessibility: 'Accessibility Information',
  pet_policy: 'Pet Policy',
}

export default function PoliciesSection({ slug }) {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/faqs/${encodeURIComponent(slug)}`)
        if (!res.ok) return
        const data = await res.json()
        // FAQs with a category that matches known policy types are shown as policies
        const policyCategories = new Set(Object.keys(POLICY_LABELS))
        const policyFaqs = (data.faqs || []).filter(f => policyCategories.has(f.category))
        setPolicies(policyFaqs)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [slug])

  if (loading) return <div className="loading">Loading policies...</div>

  if (policies.length === 0) return <p className="no-data">No policies available</p>

  return (
    <section className="content-section policies-section">
      <h2>📋 Policies & Information</h2>
      <div className="policies-accordion">
        {policies.map((policy, i) => (
          <details key={policy.id || i} className="policy-item">
            <summary>{POLICY_LABELS[policy.category] || policy.question}</summary>
            <div className="policy-content">
              {policy.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
