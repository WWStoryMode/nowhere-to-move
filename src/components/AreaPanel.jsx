import { developments } from '../lib/data.js'
import { narrative } from '../lib/narrative.js'
import { n, pct2, signed, signedPp } from '../lib/format.js'

export default function AreaPanel({ area }) {
  if (!area) {
    return (
      <aside className="panel panel--empty">
        <p className="panel-empty-title">Select an area</p>
        <p className="panel-empty-body">
          Tap any area on the map to see its overcrowded household count and rate for
          2011 and 2021 side by side.
        </p>
      </aside>
    )
  }

  const devs = developments.get(area.code) || []

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

      {devs.length > 0 && (
        <div className="panel-block panel-block--dev">
          <h3>Development</h3>
          <ul className="dev-list">
            {devs.map((d, i) => (
              <li key={i}>
                {d.name && <span className="dev-name">{d.name}</span>}
                {(d.year || d.homes) && (
                  <span className="dev-meta">
                    {[d.year, d.homes ? `${n(d.homes)} homes` : null].filter(Boolean).join(' · ')}
                  </span>
                )}
                {d.note && <span className="dev-note">{d.note}</span>}
                <a className="dev-src" href={d.source_url} target="_blank" rel="noopener noreferrer">
                  Source
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
