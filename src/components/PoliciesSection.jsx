const POLICY_LABELS = {
  cancellation: 'Cancellation Policy',
  refund: 'Refund Policy',
  house_rules: 'House Rules',
  accessibility: 'Accessibility Information',
  pet_policy: 'Pet Policy',
}

export default function PoliciesSection({ policies }) {
  const list = policies || []

  if (list.length === 0) return <p className="no-data">No policies available</p>

  return (
    <section className="content-section policies-section">
      <h2>📋 Policies & Information</h2>
      <div className="policies-accordion">
        {list.map((policy, i) => (
          <details key={policy.id || i} className="policy-item">
            <summary>{policy.title || POLICY_LABELS[policy.policy_type] || policy.policy_type || 'Policy'}</summary>
            <div className="policy-content">
              {policy.body || policy.content}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
