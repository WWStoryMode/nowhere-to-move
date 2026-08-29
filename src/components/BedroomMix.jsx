import { devSummary } from '../lib/data.js'
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
        Lewisham recorded <strong>{n(s.homes_gained)} homes gained</strong> in completed
        schemes of 20 or more between 2011 and 2021. <strong>{n(s.three_plus_bed)}</strong>{' '}
        of them — {' '}
        {s.three_plus_bed_pct}% — had three bedrooms or more. Over the same decade the
        number of overcrowded households in the borough fell by{' '}
        {Math.abs(HEADLINE.change.overcrowded)}.
      </p>

      <div className="mix-hero">
        <span className="mix-hero-fig">{s.one_or_two_bed_pct}%</span>
        <span className="mix-hero-text">
          of the homes recorded were <strong>one or two bed</strong>. The question is not
          only how many homes were built, but whether the supply expanded realistic options
          for households needing more space.
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
