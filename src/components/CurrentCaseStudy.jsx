import { CONSENTED } from '../lib/consented.js'
import { n } from '../lib/format.js'

export default function CurrentCaseStudy() {
  return (
    <section className="section case-study" aria-labelledby="case-h">
      <p className="section-kicker">Back to the contemporary case</p>
      <h2 id="case-h">What should we ask about what gets built next?</h2>
      <p className="section-lede">
        The Lewisham Shopping Centre redevelopment started this investigation. The evidence
        now returns us to that case with a framework for asking about housing quantity,
        bedroom size, tenure and realistic access to additional space.
      </p>
      <div className="case-stats">
        <div><strong>{n(CONSENTED.homes)}</strong><span>conventional homes</span></div>
        <div><strong>{n(CONSENTED.affordable)}</strong><span>affordable homes</span></div>
        <div><strong>{n(CONSENTED.socialRent)}</strong><span>social-rent homes</span></div>
      </div>
      <p>
        {CONSENTED.bedroomNote} No bedroom breakdown is charted because verified per-unit
        counts are not present in this repository.
      </p>
      <p>
        Historical Census, development, rent and earnings evidence cannot predict the
        scheme’s future effects. It does not show that the redevelopment caused past
        overcrowding, that it will cause a future outcome, or that any party to the debate
        is proved correct.
      </p>
      <p className="mix-attrib">{CONSENTED.attribution}</p>
    </section>
  )
}
