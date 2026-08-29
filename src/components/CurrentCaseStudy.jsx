import { CONSENTED } from '../lib/consented.js'
import { accessToSpace, devSummary } from '../lib/data.js'
import { HEADLINE } from '../lib/headline.js'
import { n } from '../lib/format.js'

export default function CurrentCaseStudy() {
  const largerStepShares = accessToSpace.annual.map(
    (row) => row.steps['3_to_4plus'].percentage_of_earnings
  )
  const largerStepLow = Math.min(...largerStepShares).toFixed(1)
  const largerStepHigh = Math.max(...largerStepShares).toFixed(1)

  return (
    <section className="section case-study case-study--closing" aria-labelledby="case-h">
      <p className="section-kicker">Back to where we started</p>
      <h2 id="case-h">Back to Lewisham Shopping Centre</h2>
      <p className="closing-standfirst">
        This investigation began with a dispute over what Lewisham should get from one of
        the largest developments in its town centre. After looking back at a decade of
        overcrowding, housing delivery and the cost of gaining more space, the question
        looks different.
      </p>
      <p>
        The evidence does not show that housebuilding caused overcrowding to persist, and it
        cannot tell us what the Shopping Centre redevelopment will do in the future. But it
        does show why the headline number of new homes is not enough on its own to describe
        access to space.
      </p>

      <ul className="closing-evidence" aria-label="Evidence brought back to the case study">
        <li>
          <strong>+{n(HEADLINE.change.households)} households; −{n(Math.abs(HEADLINE.change.overcrowded))} overcrowded households</strong>
          <span>between Census 2011 and Census 2021: substantial household growth while the overcrowded count was essentially flat.</span>
        </li>
        <li>
          <strong>{devSummary.one_or_two_bed_pct}% were one- or two-bedroom</strong>
          <span>among homes recorded in completed schemes of 20 or more between 2011 and 2021.</span>
        </li>
        <li>
          <strong>The larger-bedroom rent step remained the most expensive.</strong>
          <span>
            The 3→4+ private-rent step was equivalent to {largerStepLow}%–{largerStepHigh}%
            of the median gross annual earnings of one full-time Lewisham resident across
            2015–2025—roughly one-fifth or more throughout the series.
          </span>
        </li>
      </ul>

      <div className="case-scheme">
        <p className="section-kicker">The consented scheme recorded in this project</p>
        <div className="case-stats">
          <div><strong>{n(CONSENTED.homes)}</strong><span>conventional homes</span></div>
          <div><strong>{n(CONSENTED.affordable)}</strong><span>planning-defined affordable homes</span></div>
          <div><strong>{n(CONSENTED.socialRent)}</strong><span>social-rent homes</span></div>
        </div>
        <p>
          {CONSENTED.bedroomNote} No bedroom breakdown is charted because verified per-unit
          counts are not present in this repository.
        </p>
        <p className="mix-attrib">{CONSENTED.attribution}</p>
      </div>

      <div className="closing-pivot">
        <p>So the question is not simply:</p>
        <p className="closing-question">How many homes will be built?</p>
        <p>It is also:</p>
        <p className="closing-question closing-question--accent">
          How many will give households who need more space somewhere realistic to move to?
        </p>
      </div>

      <div className="closing-prompts">
        <article>
          <span>1</span>
          <h3>How many homes?</h3>
          <p>Housing quantity still matters.</p>
        </article>
        <article>
          <span>2</span>
          <h3>How many are large enough?</h3>
          <p>Bedroom mix shapes whether additional supply creates options for households needing more space.</p>
        </article>
        <article>
          <span>3</span>
          <h3>How many are realistically accessible?</h3>
          <p>
            Tenure, private-market rent, planning-defined affordability and household
            resources are distinct measures of whether homes can be reached.
          </p>
        </article>
      </div>

      <p className="closing-statement">
        The Lewisham Shopping Centre debate started this investigation. The data does not
        settle that debate. It gives us a better way to ask what the next generation of
        housing should be expected to deliver.
      </p>
    </section>
  )
}
