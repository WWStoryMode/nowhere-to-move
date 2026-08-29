import { CONSENTED } from '../lib/consented.js'
import { n } from '../lib/format.js'

export default function CurrentCaseStudy() {
  return (
    <section className="section case-study" aria-labelledby="case-h">
      <p className="section-kicker">Contemporary case study</p>
      <h2 id="case-h">Lewisham Shopping Centre redevelopment</h2>
      <p className="section-lede">
        The consented redevelopment is a live example of current debates about housing
        quantity, affordability and bedroom mix. It connects the historical 2011–2021
        evidence with decisions about what is built next; it is not treated as a cause of
        the overcrowding recorded by either census.
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
      <p className="mix-attrib">{CONSENTED.attribution}</p>
    </section>
  )
}
