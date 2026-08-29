import { HEADLINE } from '../lib/headline.js'
import { n, pct2 } from '../lib/format.js'

export const CENTRAL_RESEARCH_QUESTION = 'Why can household overcrowding remain stalled despite substantial housing construction, and what prevents households that need more space from moving into suitably sized homes?'

export default function ProjectOverview() {
  const { y2011, y2021, change } = HEADLINE

  return (
    <section className="section investigation" aria-labelledby="research-question">
      <div className="question-pivot">
        <p className="section-kicker">From dispute to investigation</p>
        <p className="question-transition">
          We took those concerns as questions to test against Lewisham’s recent history—not
          as conclusions.
        </p>
        <h2 id="research-question">{CENTRAL_RESEARCH_QUESTION}</h2>
      </div>

      <ol className="investigation-questions" aria-label="Three investigative questions">
        <li>
          <span>Question 1</span>
          <strong>Did overcrowding actually fall?</strong>
          <p>Examine overcrowded household counts and rates from 2011 to 2021.</p>
        </li>
        <li>
          <span>Question 2</span>
          <strong>What kinds of homes were built?</strong>
          <p>Examine total development, bedroom mix and affordable family-sized delivery.</p>
        </li>
        <li>
          <span>Question 3</span>
          <strong>What does it cost to gain another bedroom?</strong>
          <p>Compare private-market bedroom rent steps with local earnings.</p>
        </li>
      </ol>

      <div className="first-reveal">
        <p className="section-kicker">First finding · Did overcrowding fall?</p>
        <h2>The household count grew. The overcrowded count barely moved.</h2>
        <div className="stat-row">
          <div className="stat">
            <span className="stat-label">Households in Lewisham</span>
            <span className="stat-value stat-value--up">+{n(change.households)}</span>
            <span className="stat-detail">{n(y2011.households)} → {n(y2021.households)}</span>
          </div>
          <div className="stat stat--hero">
            <span className="stat-label">Overcrowded households</span>
            <span className="stat-value stat-value--flat">−{n(Math.abs(change.overcrowded))}</span>
            <span className="stat-detail">{n(y2011.overcrowded)} → {n(y2021.overcrowded)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Overcrowding rate</span>
            <span className="stat-value stat-value--muted">{pct2(y2011.rate)} → {pct2(y2021.rate)}</span>
            <span className="stat-detail">{change.ratePp}pp, as the household denominator grew</span>
          </div>
        </div>
        <p className="pairing-note">
          The overcrowding <strong>rate</strong> fell as the total household denominator grew,
          while the <strong>count</strong> was essentially flat. Both measures must be read
          together. The evidence places household growth and overcrowding alongside one another;
          it does not show that development caused the outcome.
        </p>
      </div>

      <p className="investigation-purpose">
        A local controversy generated the question. Lewisham is the first case study. The
        method is intended to travel across London boroughs and, where comparable development
        data exists, be adapted elsewhere.
      </p>
    </section>
  )
}
