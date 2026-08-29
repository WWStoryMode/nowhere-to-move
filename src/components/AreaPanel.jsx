import { developments, devByArea } from '../lib/data.js'
import { narrative } from '../lib/narrative.js'
import { n, pct2, signed, signedPp } from '../lib/format.js'

// The datahub records completion as DD/MM/YYYY. The year is all we show, and a
// malformed or absent date shows nothing rather than a guess.
const year = (completed) => {
  const m = /^\d{2}\/\d{2}\/(\d{4})$/.exec((completed || '').trim())
  return m ? m[1] : null
}

const CONFIDENCE = {
  low: { cls: 'is-low', label: 'Unconfirmed' },
  medium: { cls: 'is-med', label: 'Datahub only' },
  high: { cls: 'is-high', label: 'Corroborated' },
}

const SHOWN = 4

function Scheme({ d }) {
  const y = year(d.completed)
  const c = CONFIDENCE[d.confidence] || CONFIDENCE.medium
  return (
    <li>
      <span className="dev-name">{d.name}</span>
      <span className="dev-meta">
        {[
          y,
          `${n(d.homes)} homes`,
          d.affordable_homes > 0
            ? `${n(d.affordable_homes)} affordable (${d.affordable_pct}%)`
            : 'no affordable homes',
        ].filter(Boolean).join(' · ')}
      </span>
      <span className="dev-foot">
        <span className={`dev-conf ${c.cls}`}>{c.label}</span>
        <a className="dev-src" href={d.source_url} target="_blank" rel="noopener noreferrer">
          Source
        </a>
      </span>
    </li>
  )
}

export default function AreaPanel({ area }) {
  if (!area) {
    return (
      <aside className="panel panel--empty">
        <p className="panel-empty-title">Select an area</p>
        <p className="panel-empty-body">
          Tap any area on the map to see its overcrowded household count and rate for
          2011 and 2021 side by side, and what was built there.
        </p>
      </aside>
    )
  }

  // Largest first, so the schemes that shaped the area lead.
  const schemes = [...(developments.get(area.code) || [])]
    .sort((a, b) => (b.homes || 0) - (a.homes || 0))
  const agg = devByArea.get(area.code)

  return (
    <aside className="panel" aria-live="polite">
      <h2 className="panel-title">{area.name}</h2>
      <p className="panel-sub">
        {area.censusName}
        {!area.hasName && ' · no published name, showing code'}
      </p>

      <div className="panel-block">
        <h3>Overcrowded households</h3>
        <table className="panel-table">
          <thead>
            <tr><th scope="col"></th><th scope="col">2011</th><th scope="col">2021</th><th scope="col">Change</th></tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Count</th>
              <td>{n(area.oc11)}</td>
              <td>{n(area.oc21)}</td>
              <td className={area.countChange > 0 ? 'is-worse' : area.countChange < 0 ? 'is-better' : ''}>
                {signed(area.countChange)}
              </td>
            </tr>
            <tr>
              <th scope="row">Rate</th>
              <td>{pct2(area.rate11)}</td>
              <td>{pct2(area.rate21)}</td>
              <td className={area.rateChange > 0 ? 'is-worse' : area.rateChange < 0 ? 'is-better' : ''}>
                {signedPp(area.rateChange)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="panel-block">
        <h3>All households</h3>
        <table className="panel-table">
          <tbody>
            <tr>
              <th scope="row">Total</th>
              <td>{n(area.tot11)}</td>
              <td>{n(area.tot21)}</td>
              <td>{signed(area.totalChange)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="panel-narrative">{narrative(area)}</p>

      {area.isSplit && (
        <p className="panel-note">
          Split in 2021 into {area.componentNames.join(' and ')}. Shown combined so 2011
          and 2021 compare like for like; both halves on the map carry these figures.
        </p>
      )}

      <div className="panel-block panel-block--dev">
        <h3>Homes built 2011–2021</h3>

        {schemes.length === 0 ? (
          // An empty array in the data file is a finding, not missing data.
          <p className="dev-none">
            No completed schemes of 20+ homes recorded 2011–2021.
          </p>
        ) : (
          <>
            <table className="panel-table">
              <tbody>
                <tr><th scope="row">Schemes</th><td>{schemes.length}</td></tr>
                <tr><th scope="row">Homes built</th><td>{n(agg.homes)}</td></tr>
                <tr>
                  <th scope="row">Affordable</th>
                  <td>{n(agg.affordable)} ({agg.affordablePct.toFixed(1)}%)</td>
                </tr>
                <tr>
                  <th scope="row">1–2 bed</th>
                  <td>{n(agg.beds12)} ({((100 * agg.beds12) / agg.homes).toFixed(0)}%)</td>
                </tr>
                <tr>
                  <th scope="row">3+ bed</th>
                  <td>{n(agg.beds3plus)} ({((100 * agg.beds3plus) / agg.homes).toFixed(0)}%)</td>
                </tr>
              </tbody>
            </table>

            <ul className="dev-list">
              {schemes.slice(0, SHOWN).map((d, i) => <Scheme key={i} d={d} />)}
            </ul>

            {schemes.length > SHOWN && (
              <details className="dev-more">
                <summary>
                  {schemes.length - SHOWN} more scheme{schemes.length - SHOWN > 1 ? 's' : ''}
                </summary>
                <ul className="dev-list">
                  {schemes.slice(SHOWN).map((d, i) => <Scheme key={i} d={d} />)}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </aside>
  )
}
