import { devSummary } from '../lib/data.js'
import { CONSENTED } from '../lib/consented.js'
import { HEADLINE } from '../lib/headline.js'
import { bedroomRamp, BEDROOM_KEYS, BEDROOM_LABELS } from '../lib/palette.js'
import { n } from '../lib/format.js'

// All three bars share one axis - the decade's total homes - so widths are
// directly comparable. Never give the bars separate scales.
function StackedBar({ counts, total, axis, ramp, label }) {
  return (
    <div className="mix-bar" role="img" aria-label={label}>
      {BEDROOM_KEYS.map((k, i) => {
        const v = Number(counts?.[k]) || 0
        if (!v) return null
        return (
          <span
            key={k}
            className="mix-seg"
            style={{ width: `${(v / axis) * 100}%`, background: ramp[i] }}
            title={`${BEDROOM_LABELS[k]}: ${n(v)}`}
          />
        )
      })}
      <span className="mix-rest" style={{ width: `${(1 - total / axis) * 100}%` }} />
    </div>
  )
}

export default function BedroomMix({ dark }) {
  if (!devSummary) return null
  const s = devSummary
  const ramp = bedroomRamp(dark)
  const axis = s.homes_gained
  const studioCaveat = (s.caveats || []).find((c) => c.startsWith('STUDIOS'))

  return (
    <section className="section mix" aria-labelledby="mix-h">
      <h2 id="mix-h">What actually got built</h2>
      <p className="section-lede">
        Lewisham completed <strong>{n(s.homes_gained)} homes</strong> in schemes of 20 or
        more between 2011 and 2021. <strong>{n(s.three_plus_bed)}</strong> of them — {' '}
        {s.three_plus_bed_pct}% — had three bedrooms or more. Over the same decade the
        number of overcrowded households in the borough fell by{' '}
        {Math.abs(HEADLINE.change.overcrowded)}.
      </p>

      <div className="mix-hero">
        <span className="mix-hero-fig">{s.one_or_two_bed_pct}%</span>
        <span className="mix-hero-text">
          of the homes built were <strong>one or two bed</strong>. A decade of building,
          and fewer than 1,500 homes that could house a family needing three bedrooms.
        </span>
      </div>

      <ol className="mix-rows">
        <li>
          <div className="mix-row-head">
            <span className="mix-row-name">All homes completed 2011–2021</span>
            <span className="mix-row-val">{n(s.homes_gained)}</span>
          </div>
          <StackedBar counts={s.bedrooms} total={s.homes_gained} axis={axis} ramp={ramp}
            label={`All ${n(s.homes_gained)} homes completed 2011 to 2021, by bedroom count`} />
          <p className="mix-row-note">
            {n(s.one_or_two_bed)} one- or two-bed ({s.one_or_two_bed_pct}%) ·{' '}
            {n(s.three_plus_bed)} three-bed or larger ({s.three_plus_bed_pct}%)
          </p>
        </li>

        <li>
          <div className="mix-row-head">
            <span className="mix-row-name">Of those, the affordable homes</span>
            <span className="mix-row-val">{n(s.affordable_homes)}</span>
          </div>
          <StackedBar counts={s.bedrooms_affordable} total={s.affordable_homes} axis={axis}
            ramp={ramp}
            label={`The ${n(s.affordable_homes)} affordable homes, by bedroom count, on the same scale`} />
          <p className="mix-row-note">
            {s.affordable_pct}% of all homes built. Just{' '}
            <strong>{n(s.three_plus_bed_affordable)}</strong> were three-bed or larger —{' '}
            {(100 * s.three_plus_bed_affordable / s.homes_gained).toFixed(1)}% of everything
            completed in the decade.
          </p>
        </li>

        <li className="mix-row--consented">
          <div className="mix-row-head">
            <span className="mix-row-name">
              {CONSENTED.name} <span className="mix-badge">{CONSENTED.badge}</span>
            </span>
            <span className="mix-row-val">{n(CONSENTED.homes)}</span>
          </div>
          <div className="mix-bar" role="img"
            aria-label={`${CONSENTED.name}, consented but not built: ${n(CONSENTED.homes)} homes of which ${n(CONSENTED.affordable)} affordable, shown on the same scale`}>
            <span className="mix-seg mix-seg--consented"
              style={{ width: `${(CONSENTED.homes / axis) * 100}%` }} />
            <span className="mix-rest" style={{ width: `${(1 - CONSENTED.homes / axis) * 100}%` }} />
          </div>
          <p className="mix-row-note">
            {n(CONSENTED.affordable)} affordable, of which {CONSENTED.socialRent} social rent.{' '}
            {CONSENTED.bedroomNote} No bedroom breakdown is charted for this scheme, because
            no per-unit counts exist for it.
          </p>
          <p className="mix-attrib">{CONSENTED.attribution}</p>
        </li>
      </ol>

      <ul className="mix-legend">
        {BEDROOM_KEYS.map((k, i) => (
          <li key={k}>
            <span className="mix-swatch" style={{ background: ramp[i] }} aria-hidden="true" />
            <span className="mix-legend-label">{BEDROOM_LABELS[k]}</span>
            <span className="mix-legend-val">{n(Number(s.bedrooms[k]) || 0)}</span>
          </li>
        ))}
      </ul>

      {studioCaveat && <p className="mix-caveat">{studioCaveat}</p>}
    </section>
  )
}
