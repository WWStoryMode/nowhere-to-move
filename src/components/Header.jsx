import { HEADLINE } from '../lib/headline.js'
import { n, pct2 } from '../lib/format.js'

export default function Header() {
  const { y2011, y2021, change } = HEADLINE
  return (
    <header className="header">
      <p className="eyebrow">Household overcrowding · housing supply · access to space</p>
      <h1>Nowhere to Move</h1>
      <p className="subtitle">Why overcrowding persists despite new housing</p>
      <p className="standfirst">
        Lewisham’s household count grew by thousands between the 2011 and 2021 censuses,
        while planning records identify almost 10,000 homes gained in major completed
        developments. Yet the number of overcrowded households barely changed. This project
        investigates what was built, where overcrowding persisted, and how difficult it is
        for households to afford the move to a larger home. Lewisham is the first case study
        in a method designed to be applied elsewhere.
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
        The overcrowding <strong>rate</strong> fell, but the <strong>count</strong> was
        essentially flat. Every figure on this page shows them together. This comparison
        describes what changed; it does not claim that development caused the outcome.
      </p>
    </header>
  )
}
