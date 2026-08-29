import { useState } from 'react'
import { areas, gainedLost } from '../lib/data.js'
import { HEADLINE } from '../lib/headline.js'
import { n, signed, pct2 } from '../lib/format.js'

// Categorical slots 1 and 2 from the reference palette (validated adjacent pair).
// This chart encodes identity (which census year), not polarity - so it uses the
// categorical hues, not the map's diverging red/blue.
const C2011 = '#2a78d6'
const C2021 = '#eb6834'

export default function HouseholdsChart() {
  const [hover, setHover] = useState(null)
  const rows = [...areas].sort((a, b) => b.tot21 - a.tot21)
  const max = Math.max(...rows.map((r) => Math.max(r.tot11, r.tot21)))

  return (
    <section className="section">
      <h2>Where the households went</h2>
      <p className="section-lede">
        Lewisham gained <strong>{signed(HEADLINE.change.households)}</strong> households
        between 2011 and 2021. {gainedLost.gained} of the {areas.length} areas gained
        households and {gainedLost.lost} lost them. Over the same decade the number of
        overcrowded households fell by just {Math.abs(HEADLINE.change.overcrowded)} —
        it rose in {gainedLost.ocRose} areas and fell in {gainedLost.ocFell}.
      </p>

      <div className="chart-legend">
        <span><i style={{ background: C2011 }} />2011 households</span>
        <span><i style={{ background: C2021 }} />2021 households</span>
      </div>

      <div className="bars" role="table" aria-label="Total households by area, 2011 and 2021">
        {rows.map((r) => (
          <div
            className={`bar-row${hover === r.code ? ' is-hover' : ''}`}
            key={r.code}
            role="row"
            onMouseEnter={() => setHover(r.code)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="bar-name" role="rowheader">{r.name}</span>
            <span className="bar-track" role="cell">
              <span className="bar bar--a" style={{ width: `${(r.tot11 / max) * 100}%`, background: C2011 }} />
              <span className="bar bar--b" style={{ width: `${(r.tot21 / max) * 100}%`, background: C2021 }} />
              {hover === r.code && (
                <span className="bar-tip">
                  {n(r.tot11)} → {n(r.tot21)} households ({signed(r.totalChange)}) ·
                  overcrowded {n(r.oc11)} → {n(r.oc21)} ({signed(r.countChange)}),
                  rate {pct2(r.rate11)} → {pct2(r.rate21)}
                </span>
              )}
            </span>
            <span className={`bar-delta${r.totalChange > 0 ? ' is-up' : r.totalChange < 0 ? ' is-down' : ''}`} role="cell">
              {signed(r.totalChange)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
