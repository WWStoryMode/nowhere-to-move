import { HEADLINE } from '../lib/headline.js'
import { n, pct2 } from '../lib/format.js'

export default function Header() {
  const { y2011, y2021, change } = HEADLINE
  return (
    <header className="header">
      <p className="eyebrow">Lewisham · Census 2011 → 2021 · household overcrowding</p>
      <h1>6,299 homes, 54 fewer overcrowded families</h1>
      <p className="standfirst">
        Lewisham’s overcrowding <strong>rate</strong> fell between 2011 and 2021. The{' '}
        <strong>number</strong> of overcrowded households did not. Roughly 6,300 new
        households arrived and the count of overcrowded families barely moved — so the
        rate fell because the denominator grew, not because crowding eased.
      </p>

      <div className="stat-row">
        <div className="stat">
          <span className="stat-label">Households in Lewisham</span>
          <span className="stat-value stat-value--up">+{n(change.households)}</span>
          <span className="stat-detail">
            {n(y2011.households)} → {n(y2021.households)}
          </span>
        </div>

        <div className="stat stat--hero">
          <span className="stat-label">Overcrowded households</span>
          <span className="stat-value stat-value--flat">−{n(Math.abs(change.overcrowded))}</span>
          <span className="stat-detail">
            {n(y2011.overcrowded)} → {n(y2021.overcrowded)}
          </span>
        </div>

        <div className="stat">
          <span className="stat-label">Overcrowding rate</span>
          <span className="stat-value stat-value--muted">
            {pct2(y2011.rate)} → {pct2(y2021.rate)}
          </span>
          <span className="stat-detail">
            {change.ratePp}pp — but on {n(change.households)} more households
          </span>
        </div>
      </div>

      <p className="pairing-note">
        Every figure on this page shows the <strong>count</strong> beside the{' '}
        <strong>rate</strong>. Quoted on its own, the falling rate tells the opposite story.
      </p>
    </header>
  )
}
