import { rampFor } from '../lib/palette.js'

export default function Legend({ view, dark }) {
  const ramp = rampFor(view, dark)
  return (
    <div className="legend">
      <p className="legend-title">{view.label}</p>
      <p className="legend-blurb">{view.blurb}</p>
      <ul className="legend-scale">
        {view.legend.map((label, i) => (
          <li key={label}>
            <span className="legend-swatch" style={{ background: ramp[i] }} aria-hidden="true" />
            <span className="legend-label">{label}</span>
          </li>
        ))}
      </ul>
      {view.kind === 'diverging' && (
        <p className="legend-key">
          <span className="legend-key-blue" /> improved
          <span className="legend-key-red" /> worsened
        </p>
      )}
    </div>
  )
}
