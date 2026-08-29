import { retrievalDate } from '../lib/data.js'

export default function Footer() {
  return (
    <footer className="footer">
      <p className="caveat">
        The 2021 census was taken during lockdown (March 2021), which affected student and
        shared households.
      </p>
      <dl className="sources">
        <div>
          <dt>2021</dt>
          <dd>Census 2021 table TS052, Occupancy rating for bedrooms (ONS, via Nomis NM_2070_1)</dd>
        </div>
        <div>
          <dt>2011</dt>
          <dd>Census 2011 table QS412EW, Occupancy rating (bedrooms), 2014 revision (ONS, via Nomis NM_544_1)</dd>
        </div>
        <div>
          <dt>Boundaries</dt>
          <dd>MSOA December 2021 boundaries, generalised clipped (BGC) — ONS Open Geography Portal</dd>
        </div>
        <div>
          <dt>Geography</dt>
          <dd>
            Joined like for like on the 2011 MSOA footprint using the ONS MSOA 2011→2021
            lookup. One area (Lewisham 012) split into two in 2021 and is shown combined,
            so both censuses describe the same ground.
          </dd>
        </div>
        <div>
          <dt>Area names</dt>
          <dd>House of Commons Library MSOA Names dataset</dd>
        </div>
        <div>
          <dt>Definitions</dt>
          <dd>
            Overcrowded = occupancy rating for bedrooms of −1, plus −2 or less. Rate =
            overcrowded households ÷ all households.
          </dd>
        </div>
        {retrievalDate && (
          <div>
            <dt>Retrieved</dt>
            <dd>{retrievalDate}</dd>
          </div>
        )}
      </dl>
      <p className="licence">
        Contains public sector information licensed under the Open Government Licence v3.0.
        Source data and the fetch script are published with this page. Mapping by{' '}
        <a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a>.
      </p>
    </footer>
  )
}
