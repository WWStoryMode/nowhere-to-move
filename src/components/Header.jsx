import { CONSENTED } from '../lib/consented.js'
import { n } from '../lib/format.js'

export default function Header() {
  return (
    <header className="header">
      <p className="eyebrow">An investigation beginning in Lewisham</p>
      <h1>Nowhere to Move</h1>
      <p className="subtitle">
        A fight over Lewisham Shopping Centre raised a bigger question about housing,
        overcrowding and access to space.
      </p>

      <div className="opening-case">
        <div className="opening-case-copy">
          <p className="section-kicker">The real-world conflict</p>
          <h2>What kind of housing should replace Lewisham Shopping Centre?</h2>
          <p>
            A major consented redevelopment proposes <strong>{n(CONSENTED.homes)} conventional
            homes</strong> on the Shopping Centre site. The debate around it is not only about
            how many homes can be delivered, but what those homes offer and who can realistically
            access them.
          </p>
          <p>
            Arguments for redevelopment emphasise housing delivery, regeneration, viability and
            deliverability. Local campaigners have raised a different set of concerns: how much
            housing is genuinely affordable, whether enough larger and family-sized homes are
            included, and whether headline totals meet the needs of existing residents.
          </p>
          <p className="opening-attribution">
            These are positions in a public debate, not findings of this project. The scheme
            figures and debate framing are project records whose external source links still
            require verification.
          </p>
        </div>
        <div className="opening-visual" aria-label="Space reserved for a verified Lewisham Shopping Centre image">
          <span>Lewisham Shopping Centre</span>
          <small>Image space — no unverified asset used</small>
        </div>
      </div>
    </header>
  )
}
