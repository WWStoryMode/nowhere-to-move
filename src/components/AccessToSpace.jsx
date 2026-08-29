import { useState } from 'react'
import { accessToSpace, provenanceById } from '../lib/data.js'
import { n } from '../lib/format.js'

const SERIES = [
  { key: '1_to_2', label: '1→2 bedrooms', colour: 'var(--access-12)', dash: '', shape: 'circle' },
  { key: '2_to_3', label: '2→3 bedrooms', colour: 'var(--access-23)', dash: '9 5', shape: 'square' },
  { key: '3_to_4plus', label: '3→4+ bedrooms', colour: 'var(--access-34)', dash: '3 4', shape: 'triangle' },
]

const MODES = {
  annual: {
    label: 'Annual additional rent (£)',
    value: (step) => step.annual_additional_rent_gbp,
    format: (value) => `£${n(Math.round(value))}`,
    tick: (value) => value === 0 ? '£0' : `£${n(value)}`,
  },
  earnings: {
    label: 'As % of annual earnings',
    value: (step) => step.percentage_of_earnings,
    format: (value) => `${value.toFixed(1)}%`,
    tick: (value) => `${value}%`,
  },
}

const WIDTH = 780
const HEIGHT = 390
const MARGIN = { top: 28, right: 34, bottom: 48, left: 66 }

function Point({ shape, x, y, colour }) {
  if (shape === 'square') {
    return <rect x={x - 4.5} y={y - 4.5} width="9" height="9" fill={colour} />
  }
  if (shape === 'triangle') {
    return <path d={`M ${x} ${y - 5.5} L ${x + 5.5} ${y + 4.5} L ${x - 5.5} ${y + 4.5} Z`} fill={colour} />
  }
  return <circle cx={x} cy={y} r="4.5" fill={colour} />
}

function TrendChart({ modeId }) {
  const [active, setActive] = useState(null)
  const rows = accessToSpace.annual
  const mode = MODES[modeId]
  const plotWidth = WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const values = rows.flatMap((row) => SERIES.map((series) => mode.value(row.steps[series.key])))
  const rawMax = Math.max(...values)
  const increment = modeId === 'annual' ? 2000 : 5
  const yMax = Math.ceil((rawMax * 1.08) / increment) * increment
  const ticks = Array.from({ length: yMax / increment + 1 }, (_, i) => i * increment)
  const x = (index) => MARGIN.left + (index / (rows.length - 1)) * plotWidth
  const y = (value) => MARGIN.top + plotHeight - (value / yMax) * plotHeight

  const activeIndex = active ? rows.findIndex((row) => row.year === active.year) : -1
  const activeRow = activeIndex >= 0 ? rows[activeIndex] : null
  const activeSeries = active && SERIES.find((series) => series.key === active.key)
  const activeValue = activeRow && activeSeries ? mode.value(activeRow.steps[activeSeries.key]) : null

  return (
    <div className="access-chart-wrap">
      <svg className="access-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img"
        aria-labelledby="access-chart-title access-chart-desc">
        <title id="access-chart-title">Lewisham private-rent cost of gaining one bedroom, 2015 to 2025</title>
        <desc id="access-chart-desc">
          Three time series compare the 1 to 2, 2 to 3, and 3 to 4 plus bedroom rent steps.
          Switch between annual additional rent and that cost as a percentage of median gross
          annual earnings of full-time Lewisham residents.
        </desc>

        {ticks.map((tick) => (
          <g key={tick}>
            <line className="access-grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right}
              y1={y(tick)} y2={y(tick)} />
            <text className="access-axis-label" x={MARGIN.left - 10} y={y(tick) + 4}
              textAnchor="end">{mode.tick(tick)}</text>
          </g>
        ))}

        {rows.map((row, index) => (
          <g key={row.year}>
            <line className="access-x-tick" x1={x(index)} x2={x(index)}
              y1={HEIGHT - MARGIN.bottom} y2={HEIGHT - MARGIN.bottom + 5} />
            <text className="access-axis-label" x={x(index)} y={HEIGHT - MARGIN.bottom + 22}
              textAnchor="middle">{row.year}</text>
          </g>
        ))}

        {SERIES.map((series) => {
          const path = rows.map((row, index) => {
            const value = mode.value(row.steps[series.key])
            return `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`
          }).join(' ')
          return (
            <g key={series.key}>
              <path d={path} fill="none" stroke={series.colour} strokeWidth="3"
                strokeDasharray={series.dash || undefined} strokeLinejoin="round" />
              {rows.map((row, index) => {
                const value = mode.value(row.steps[series.key])
                const label = `${row.year}, ${series.label}: ${mode.format(value)}`
                return (
                  <g key={row.year} className="access-point" tabIndex="0" role="img"
                    aria-label={label}
                    onMouseEnter={() => setActive({ year: row.year, key: series.key })}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive({ year: row.year, key: series.key })}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive({ year: row.year, key: series.key })}>
                    <circle cx={x(index)} cy={y(value)} r="11" fill="transparent" />
                    <Point shape={series.shape} x={x(index)} y={y(value)} colour={series.colour} />
                    <title>{label}</title>
                  </g>
                )
              })}
            </g>
          )
        })}

        {activeRow && activeSeries && (
          <g className="access-tooltip" pointerEvents="none">
            <line x1={x(activeIndex)} x2={x(activeIndex)} y1={MARGIN.top}
              y2={HEIGHT - MARGIN.bottom} />
            <rect x={Math.min(x(activeIndex) + 10, WIDTH - 224)}
              y={Math.max(y(activeValue) - 46, 8)} width="210" height="42" rx="6" />
            <text x={Math.min(x(activeIndex) + 20, WIDTH - 214)}
              y={Math.max(y(activeValue) - 21, 33)}>
              {activeRow.year} · {activeSeries.label} · {mode.format(activeValue)}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

function SeriesKey() {
  return (
    <ul className="access-key" aria-label="Chart series">
      {SERIES.map((series) => (
        <li key={series.key}>
          <svg width="34" height="14" aria-hidden="true">
            <line x1="1" x2="33" y1="7" y2="7" stroke={series.colour} strokeWidth="3"
              strokeDasharray={series.dash || undefined} />
            <Point shape={series.shape} x={17} y={7} colour={series.colour} />
          </svg>
          {series.label}
        </li>
      ))}
    </ul>
  )
}

function ValuesTable() {
  return (
    <details className="access-values">
      <summary>View all annual values</summary>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Year</th>
              {SERIES.flatMap((series) => [
                <th scope="col" key={`${series.key}-cash`}>{series.label} £</th>,
                <th scope="col" key={`${series.key}-pct`}>{series.label} earnings</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {accessToSpace.annual.map((row) => (
              <tr key={row.year}>
                <th scope="row">{row.year}</th>
                {SERIES.flatMap((series) => {
                  const step = row.steps[series.key]
                  return [
                    <td key={`${series.key}-cash`}>£{n(Math.round(step.annual_additional_rent_gbp))}</td>,
                    <td key={`${series.key}-pct`}>{step.percentage_of_earnings.toFixed(1)}%</td>,
                  ]
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

function Source({ id, children }) {
  const source = provenanceById.get(id)
  if (source?.url) {
    return <a href={source.url} target="_blank" rel="noopener noreferrer">{children}</a>
  }
  return (
    <span>
      {children} <span className="source-unverified">(exact URL requires verification)</span>
    </span>
  )
}

export default function AccessToSpace() {
  const [modeId, setModeId] = useState('annual')
  const rows = Object.fromEntries(accessToSpace.annual.map((row) => [row.year, row]))
  const y2015 = rows[2015]
  const y2024 = rows[2024]
  const y2025 = rows[2025]
  const step23CashRise = Math.round(
    ((y2024.steps['2_to_3'].annual_additional_rent_gbp / y2015.steps['2_to_3'].annual_additional_rent_gbp) - 1) * 100
  )
  const step23ShareRise = Math.round(
    ((y2024.steps['2_to_3'].percentage_of_earnings / y2015.steps['2_to_3'].percentage_of_earnings) - 1) * 100
  )

  return (
    <section className="section access" aria-labelledby="access-h">
      <p className="section-kicker">Access to additional space</p>
      <h2 id="access-h">What does one more bedroom cost?</h2>
      <p className="section-lede">
        For households needing more space, the private rental market introduces another
        constraint: the additional rent required to gain another bedroom. This series
        compares that annual step in Lewisham and measures it against the earnings of one
        full-time resident.
      </p>

      <div className="access-findings">
        <p>
          <strong>The 3→4+ step is the largest.</strong> In 2024 it was about{' '}
          <strong>£{n(Math.round(y2024.steps['3_to_4plus'].annual_additional_rent_gbp))}</strong>{' '}
          a year—equivalent to about{' '}
          <strong>{y2024.steps['3_to_4plus'].percentage_of_earnings.toFixed(1)}%</strong>{' '}
          of the median gross annual earnings of one full-time Lewisham resident. It remains
          by far the largest financial step throughout the series.
        </p>
        <p>
          <strong>The 2→3 burden has grown fastest relative to earnings.</strong> It rose
          from £{n(Math.round(y2015.steps['2_to_3'].annual_additional_rent_gbp))} ({y2015.steps['2_to_3'].percentage_of_earnings.toFixed(1)}%)
          in 2015 to £{n(Math.round(y2024.steps['2_to_3'].annual_additional_rent_gbp))} ({y2024.steps['2_to_3'].percentage_of_earnings.toFixed(1)}%)
          in 2024—about {step23CashRise}% more in cash and a {step23ShareRise}% relative rise
          in earnings share. The latest complete year, 2025, was £{n(Math.round(y2025.steps['2_to_3'].annual_additional_rent_gbp))} ({y2025.steps['2_to_3'].percentage_of_earnings.toFixed(1)}%).
        </p>
      </div>

      <div className="access-chart-head">
        <SeriesKey />
        <div className="toggle access-toggle" role="group" aria-label="Chart measure">
          {Object.entries(MODES).map(([id, mode]) => (
            <button key={id} className={`toggle-btn${modeId === id ? ' is-active' : ''}`}
              aria-pressed={modeId === id} onClick={() => setModeId(id)}>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      <TrendChart modeId={modeId} />
      <p className="access-chart-note">
        The 1→2 earnings burden is comparatively stable across the period. Hover, tap or
        focus a point for its value, or open the table below.
      </p>
      <ValuesTable />

      <div className="access-caveat">
        <strong>How to read the earnings measure.</strong> The denominator is median gross
        annual earnings of full-time Lewisham residents. It is not household, private-renter,
        overcrowded-household or disposable income. Rent figures measure the private rental
        market and do not describe affordable housing.
      </div>
      <p className="access-source">
        Sources: <Source id="ons_pipr">ONS Price Index of Private Rents (PIPR)</Source>;{' '}
        <Source id="ashe_resident_earnings">
          ASHE resident-based median gross annual earnings for full-time workers
        </Source>. Source status is recorded in project provenance.
      </p>
    </section>
  )
}
