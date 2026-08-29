import { CONSENTED } from '../lib/consented.js'
import { n } from '../lib/format.js'
import shoppingCentrePhoto from '../assets/lewisham-shopping-centre.jpg'

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
        <figure className="opening-visual">
          <img
            src={shoppingCentrePhoto}
            alt="Interior of Lewisham Shopping Centre, photographed in March 2022"
          />
          <figcaption>
            Lewisham Shopping Centre · Photograph by{' '}
            <a href="https://commons.wikimedia.org/wiki/File:Lewisham_Shopping_Centre_2.jpg"
              target="_blank" rel="noopener noreferrer">Mx. Granger / Wikimedia Commons</a>{' '}
            · <a href="https://creativecommons.org/publicdomain/zero/1.0/"
              target="_blank" rel="noopener noreferrer">CC0 1.0</a>
          </figcaption>
        </figure>
      </div>
    </header>
  )
}
