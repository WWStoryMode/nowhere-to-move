export default function LimitationsBox() {
  return (
    <section className="limitations">
      <h2>What this data cannot show</h2>
      {/* Supplied text, used verbatim. Do not rewrite. */}
      <p>
        This data cannot show whether families moved out. A falling overcrowding rate is
        consistent with two very different stories: conditions improved for the people who
        stayed, or overcrowded households left the borough and better-off households
        replaced them. Census counts at two points in time cannot distinguish these,
        because they count households in an area, not the same households over time.
      </p>
      <ul className="limitations-list">
        <li>PIPR reports average private-market rents, not rents specifically paid by overcrowded households.</li>
        <li>ASHE median gross annual earnings for full-time residents are a benchmark, not household income.</li>
        <li>The PIPR “4+ bedrooms” measure is one combined ONS category.</li>
        <li>
          The rent-step analysis documents financial barriers consistent with constrained
          access to space; it does not show that rent levels caused the observed overcrowding.
        </li>
        <li>Aggregate Census, rent, earnings and development data cannot establish how individual households behaved.</li>
        <li>
          Private-market rents are distinct from planning-defined affordable housing; the
          two measures should not be treated as interchangeable.
        </li>
      </ul>
    </section>
  )
}
