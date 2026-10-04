// Loading, empty and error states shared by every public-layer page.

export function Loading({ label = 'Loading…', rows = 3 }) {
  return (
    <div className="pl-state pl-loading" role="status" aria-busy="true" aria-live="polite">
      <span className="pl-sr">{label}</span>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="pl-skeleton" />)}
    </div>
  )
}

export function Empty({ title, children, action }) {
  return (
    <div className="pl-state pl-empty">
      {title && <p className="pl-state-title">{title}</p>}
      {children && <p className="pl-state-body">{children}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry, title }) {
  const notConnected = error?.notConnected
  return (
    <div className="pl-state pl-error" role="alert">
      <p className="pl-state-title">{title || (notConnected ? 'Not available yet' : 'Something went wrong')}</p>
      <p className="pl-state-body">
        {notConnected ? 'This part of the site is not switched on yet.' : (error?.message || 'Please try again.')}
      </p>
      {onRetry && !notConnected && <button type="button" className="pl-btn" onClick={onRetry}>Try again</button>}
    </div>
  )
}
