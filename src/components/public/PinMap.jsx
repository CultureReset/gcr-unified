// A small map of places from their own coordinates: pins on a projected
// plane, each one a link to the place. No tile service or map key needed.

import { Link } from 'react-router-dom'

function mercY(lat) {
  const r = (Number(lat) * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + r / 2))
}

export default function PinMap({ places, label = 'Map', height = 240 }) {
  const pts = (places || []).filter(p => Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)) && (Number(p.latitude) || Number(p.longitude)))
  if (!pts.length) return null
  const xs = pts.map(p => Number(p.longitude))
  const ys = pts.map(p => mercY(p.latitude))
  const pad = 0.12
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const spanX = Math.max(maxX - minX, 0.01), spanY = Math.max(maxY - minY, 0.01)
  const W = 1000, H = Math.round((W * height) / 600)
  const px = x => (pad + ((x - minX) / spanX) * (1 - 2 * pad)) * W
  const py = y => (1 - (pad + ((y - minY) / spanY) * (1 - 2 * pad))) * H

  return (
    <figure className="pl-map" aria-label={label}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width={W} height={H} className="pl-map-bg" rx="24" />
        {pts.map((p, i) => {
          const x = px(Number(p.longitude)), y = py(mercY(p.latitude))
          return (
            <Link key={p.slug || i} to={p.href || `/business/${encodeURIComponent(p.slug)}`} aria-label={p.name}>
              <circle cx={x} cy={y} r="18" className="pl-map-pin" />
              <text x={x} y={y + 6} textAnchor="middle" className="pl-map-num">{i + 1}</text>
            </Link>
          )
        })}
      </svg>
      <figcaption>
        <ol className="pl-map-legend">
          {pts.map((p, i) => <li key={p.slug || i}><Link to={p.href || `/business/${encodeURIComponent(p.slug)}`}>{p.name}</Link>{p.caption ? <span className="pl-muted"> · {p.caption}</span> : null}</li>)}
        </ol>
      </figcaption>
    </figure>
  )
}
