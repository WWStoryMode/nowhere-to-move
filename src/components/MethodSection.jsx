export default function MethodSection() {
  return (
    <section className="section text-section" aria-labelledby="method-h">
      <p className="section-kicker">Method and reuse</p>
      <h2 id="method-h">A framework designed to travel</h2>
      <p className="section-lede">
        The method combines three connected strands: the overcrowding outcome, the bedroom
        mix of housing supply, and the cost of accessing an additional bedroom relative to
        local earnings.
      </p>
      <ol className="method-steps">
        <li>
          <strong>Overcrowding outcome:</strong> compare household count and rate at Census
          2011 and Census 2021, including geographic variation between MSOAs.
        </li>
        <li>
          <strong>Housing supply and bedroom mix:</strong> separate completed one- and
          two-bedroom homes from three-bedroom-or-larger homes, and identify affordable
          family-sized delivery where the planning data permits.
        </li>
        <li>
          <strong>Access to additional space:</strong> for each month, subtract the
          smaller-bedroom PIPR average private rent from the larger-bedroom rent. For each
          complete calendar year, take the mean monthly step and multiply by 12. Divide that
          annual rent step by ASHE median gross annual earnings for full-time Lewisham
          residents, then multiply by 100.
        </li>
      </ol>
      <p>
        PIPR describes the <strong>private rental market</strong>. It is analytically distinct
        from the planning-defined affordable housing recorded in the development data.
      </p>
      <p>
        Census, rent and earnings measures come from national official datasets and can
        potentially be applied to other areas. The development analysis currently relies on
        the GLA Planning London Datahub, making the present workflow especially suited to
        London. Outside London, a comparable local development dataset would need to be
        identified and its coverage tested.
      </p>
      <p>
        The project is designed to be reusable across London boroughs and adaptable to other
        English local authorities where comparable development data is available.
      </p>
    </section>
  )
}
