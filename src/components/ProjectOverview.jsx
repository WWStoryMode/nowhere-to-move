export default function ProjectOverview() {
  return (
    <section className="section overview" aria-label="Project background, scope and objective">
      <div className="overview-block">
        <p className="section-kicker">Background</p>
        <h2>Persistent overcrowding despite housing growth</h2>
        <p>
          Household overcrowding remains persistent in many parts of London even where
          substantial residential development has taken place. Lewisham is the initial case
          study: between 2011 and 2021 its household count increased by 6,299, while the
          number of overcrowded households fell by only 54. The rate declined, but the count
          was essentially flat, so both measures must be read together.
        </p>
      </div>

      <div className="overview-block">
        <p className="section-kicker">Project scope</p>
        <h2>Three connected strands</h2>
        <ol className="overview-strands">
          <li>
            <strong>Overcrowding outcome</strong>
            <span>Count, rate and geographic variation between Census 2011 and Census 2021.</span>
          </li>
          <li>
            <strong>Housing supply and bedroom mix</strong>
            <span>Completed one- and two-bedroom versus three-bedroom-or-larger supply, including affordable family-sized delivery where the data permits.</span>
          </li>
          <li>
            <strong>Access to additional space</strong>
            <span>Private-market rent steps between bedroom sizes, compared with median gross annual earnings of full-time Lewisham residents.</span>
          </li>
        </ol>
      </div>

      <div className="overview-block overview-block--objective">
        <p className="section-kicker">Objective</p>
        <h2>Ask whether households can realistically move</h2>
        <p>
          The evidence documents a mismatch between persistent overcrowding, the bedroom mix
          of housing supply, and the financial cost of obtaining additional space. It does
          not establish that one caused another. Lewisham provides the first implementation
          of a transparent method designed for reuse elsewhere.
        </p>
      </div>
    </section>
  )
}
