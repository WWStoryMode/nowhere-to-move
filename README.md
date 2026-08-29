# Nowhere to Move

An evidence-based investigation into why household overcrowding can remain
stubbornly high despite substantial housing development.

Lewisham is the initial case study. The project combines Census overcrowding
data, the bedroom mix of completed housing development, and the cost of gaining
an additional bedroom relative to local earnings.

The longer-term aim is to build a transparent and reproducible methodology that
can be reused across London boroughs and adapted to other English local
authorities where comparable development data is available.

The central question is:

> Why can household overcrowding remain stalled despite substantial housing
> construction, and what prevents households that need more space from moving
> into suitably sized homes?

## Project scope

The investigation connects three analytical strands:

1. **Overcrowding outcome.** Measure the count and rate of overcrowded households
   in 2011 and 2021, including variation between MSOAs. Count and rate are always
   shown together, and the analysis makes no causal claim about development.
2. **Housing supply and bedroom mix.** Examine completed development, separating
   total growth from three-bedroom-or-larger supply, affordable supply, and
   affordable family-sized supply where the source data permits.
3. **Access to additional space.** Calculate the rent required to gain another
   bedroom using ONS PIPR average private rents, then express that annual cost as
   a share of ASHE median gross annual earnings for full-time Lewisham residents.
   The validated annual dataset and interactive public time series cover the
   complete calendar years 2015–2025.

The project moves beyond asking whether an area is building enough homes. It
asks whether the housing system is producing the right kinds of homes, in forms
that households needing additional space can realistically access.

The evidence documents a mismatch between persistent overcrowding, the bedroom
mix of housing supply, and the financial cost of obtaining additional space. It
does not establish that any one of these measures caused another.

## The headline

| | 2011 | 2021 | Change |
|---|---|---|---|
| Overcrowded households | 14,018 | 13,964 | **−54** |
| All households | 116,091 | 122,390 | **+6,299** |
| Overcrowding rate | 12.08% | 11.41% | −0.67pp |

The **rate** fell as the household denominator grew. The **count** of overcrowded
households was essentially flat while the total household count increased by
6,299.

Rate and count must always be read together. A rate quoted alone tells the
opposite story.

These figures describe changes observed over the decade. They do not show that
housing construction caused overcrowding to rise, fall or remain flat.

## Lewisham Shopping Centre: a contemporary case study

The consented Lewisham Shopping Centre redevelopment remains part of the
project as a current example of debates about housing quantity, affordability
and bedroom mix. It connects the historical 2011–2021 evidence with decisions
about what is built next. It is not the purpose or political audience of the
project, and the analysis does not claim that the scheme caused or will cause a
particular overcrowding outcome.

The repository currently records 1,744 conventional homes, including 329
affordable homes and 98 for social rent. Its qualitative bedroom-mix description
is not charted because verified per-unit counts are not present in the repository.

## Reuse and transferability

Lewisham is the first implementation of a wider analytical framework. Census,
rent and earnings measures use national official datasets and can potentially be
applied to other areas. The bedroom-mix component currently uses the GLA Planning
London Datahub, so the present pipeline is especially suited to London. Outside
London, an equivalent development dataset would need to be substituted and its
coverage assessed.

The method is designed to be reusable across London boroughs and adaptable to
other English local authorities where comparable development data is available.

## Definitions

- **Overcrowded** = occupancy rating for bedrooms of −1, *plus* −2 or less.
- **Rate** = overcrowded households ÷ total all households.
- "Total" is a total, never summed as if it were a category.

## Sources

| Source | Dataset | Notes |
|---|---|---|
| Census 2021 TS052 | Nomis `NM_2070_1` | Occupancy rating for bedrooms |
| Census 2011 QS412EW | Nomis `NM_544_1` | Occupancy rating (bedrooms), 2014-01-17 revision |
| MSOA Dec 2021 boundaries | ONS Open Geography Portal | Generalised clipped (BGC), EPSG:4326 |
| MSOA 2011→2021 lookup | ONS Open Geography Portal | With `CHNGIND` change indicator |
| MSOA names | House of Commons Library | `msoanames` — readable area names |
| Bedroom rents | ONS Price Index of Private Rents | Exact source URL requires verification |
| Resident earnings | ASHE, full-time workers | Exact source URL requires verification |

All Open Government Licence v3.0. Exact URLs and retrieval timestamps are in
`data/provenance.json`; raw API responses are cached in `data/raw/`.

## Geography note

Lewisham had **36 MSOAs in 2011** and **37 in 2021**. One area changed:
`E02000664` (Lewisham 012) **split** into `E02007008` and `E02007009`
(`CHNGIND = S`). The other 35 kept their codes.

Two outputs are produced as a result:

- `data/lewisham_overcrowding.csv` — 37 rows on 2021 codes. The two split
  children have **blank** 2011 columns, because the 2011 parent cannot be
  divided between them without fabricating data.
- `data/lewisham_overcrowding_like_for_like.csv` — 36 rows on the 2011
  footprint, with the two 2021 children summed back onto the parent. Exact
  arithmetic on household counts, so the years compare like for like. **This is
  the file the visualisation uses.**

> Caution: the ONS service `MSOA11_MSOA21_LAD22_EW_LU_v2` has `CHNGIND` entirely
> null and contains only one of the two split rows, silently losing Lewisham
> 040. Use `MSOA_(2011)_to_MSOA_(2021)_to_Local_Authority_District_(2022)_Lookup_for_EW_v2`
> instead — `fetch_data.py` hard-fails if `CHNGIND` comes back empty.

## Caveats

- 2021 MSOA sums differ from the independently-fetched borough total by +3
  overcrowded / −2 households (~0.02%). This is ONS **cell-key perturbation**,
  applied independently at each geography level. 2011 reconciles exactly
  because it used record swapping instead. Published MSOA figures are used as
  they stand and are never rescaled to force a match.
- The 2021 census was taken during lockdown (March 2021), which affected
  student and shared households.
- **This data cannot show whether families moved out.** A falling overcrowding
  rate is consistent with two very different stories: conditions improved for
  the people who stayed, or overcrowded households left the borough and
  better-off households replaced them. Census counts at two points in time
  cannot distinguish these, because they count households in an area, not the
  same households over time.

### Access-to-space caveats

- PIPR reports average **private-market rents**, not rents specifically paid by
  overcrowded households. These rents are distinct from the planning-defined
  affordable housing recorded in the development data.
- ASHE median gross annual earnings for full-time Lewisham residents are an
  earnings benchmark, not household income, private-renter household income,
  overcrowded-household income or disposable income.
- `4+ bedrooms` is a combined ONS category and is never treated as exactly four
  bedrooms.
- The analysis documents financial barriers consistent with constrained access
  to space. It does not demonstrate that rent levels caused the observed
  overcrowding.
- The sources are aggregate datasets and cannot establish how individual
  households behaved.

## The page

A single-page Vite + React investigation combining a bedroom-mix exhibit,
MSOA-level overcrowding maps and tables, household-growth context, an interactive
rent/earnings time series, and the contemporary Lewisham Shopping Centre case study.

```bash
nvm use                 # Node 20.20.2 - the system Node 14 is too old for Vite
npm install
npm run dev             # local development
npm run build           # -> dist/index.html
```

`npm run build` emits **one self-contained `dist/index.html`** (~589 KB). Every
asset and all data files are inlined, so it opens offline straight from the
filesystem — double-click it, or AirDrop it to a phone. It makes no network
requests at all: there is no `fetch`, no `XMLHttpRequest`, and no basemap tile
layer.

Three map views, with the count-change view leading and set as the default,
because it is the one that carries the argument:

1. **Change in overcrowded households** (count) — diverging red/blue
2. **Change in overcrowding rate** (percentage points) — diverging red/blue
3. **2021 overcrowding rate** — sequential red, since higher always means worse

Counts and rates always appear together — in the header, the legend, every map
tooltip, the side panel and every table row. A rate quoted alone reverses the
story, so the page never shows one.

The colour scales are colourblind-safe by measurement, not by eye: the red arm
is derived in OKLCH at the blue ramp's exact lightness steps, and adjacent-step
CVD separation measures 13.9 (light) and 17.8 (dark) against a floor of 8.

`#view=<id>&area=<msoa21cd>` deep-links a specific area, so a link can point at
one neighbourhood's figures.

### Development data by area

`data/developments.json` supplies the borough bedroom-mix exhibit and per-area
development detail. It is keyed by the area code used in the like-for-like table:

```json
{
  "E02000653": [
    { "name": "", "year": 2024, "homes": 0, "note": "", "source_url": "https://…" }
  ]
}
```

Only entries with a non-empty `source_url` are rendered, and each one shows its
source as a link. An empty area array means no qualifying completed scheme was
recorded there; it is not treated as missing data. Because data is inlined at
build time, updating it requires re-running `npm run build`.

## What was built, 2011–2021

`data/developments.json` catalogues **99 completed schemes of 20+ homes**, from the
GLA [Planning London Datahub](https://planningdata.london.gov.uk/api-guest/) (which
absorbed the London Development Database). Every scheme is located by
point-in-polygon of the datahub's own centroid against the MSOA boundaries — never
inferred from census household growth.

**9,895 homes** were gained across those schemes:

| Bedrooms | Market | Affordable | Total | % |
|---|---|---|---|---|
| 1 (or studio) | 3,017 | 1,130 | 4,147 | 41.9% |
| 2 | 2,852 | 1,410 | 4,262 | 43.1% |
| 3 | 603 | 637 | 1,240 | 12.5% |
| 4 | 54 | 184 | 238 | 2.4% |
| 5+ | 0 | 8 | 8 | 0.1% |

**85% were 1–2 bed. 15% had three or more bedrooms. 8.4% — 829 homes across a
decade — were both family-sized and affordable.**

Private-led schemes cluster at 12–23% affordable (Arklow 12.7%, Cannon Wharf 17.2%,
Renaissance 23.4%); estate regeneration runs far higher (Kender Triangle 73.5%,
Heathside & Lethbridge 43.7–51.3%). Nineteen schemes delivered 1,215 homes with
**no affordable housing at all**, including Lewisham Gateway's 362 homes.

Ten MSOAs have an explicit empty array — no scheme of 20+ homes completed there in
the period. That is a finding, not a gap.

### Limits of this catalogue

- **Studios cannot be separated from 1-beds.** No unit record in Lewisham carries a
  zero bedroom count (0 of 9,947), yet at least one scheme description lists studio
  apartments. The "1" category means one-bed-or-studio.
- Figures are homes **gained**. Demolitions are recorded inconsistently and carry no
  bedroom count, so these are not net figures.
- `affordable_pct` is **per planning record, not per scheme**. Phased developments
  appear as several records with very different shares — Catford Green splits into
  414 units at 71.3% and 179 at 7.8%, and the Housing Design Awards puts the whole
  scheme at 29%. That conflict is unresolved and marked `confidence: low`.
- The datahub is self-reported by boroughs and applicants and is explicitly **not
  quality-checked on receipt** by the GLA.
- Homes here must **not** be reconciled against census household change — they are
  gross gains on completed applications, on a different basis entirely.

Only one scheme (Renaissance) is `confidence: high`, corroborated independently.
Most rest on the datahub alone and are marked `medium`. Every entry carries a
resolving per-record URL.

## Access to additional space (Strand B)

`data/access_to_space.json` contains the derived annual series for 2015–2025.
It combines:

- monthly Lewisham average rents for one, two, three and four-or-more bedrooms
  from the ONS Price Index of Private Rents;
- resident-based median gross annual earnings for full-time Lewisham workers
  from ASHE.

For each of **1→2 bedrooms**, **2→3 bedrooms** and **3→4+ bedrooms**,
`build_access_to_space.py` applies this calculation:

```text
For each month:
  larger-bedroom average private rent − smaller-bedroom average private rent

For each complete calendar year:
  mean monthly rent step × 12 = annual additional rent

Then:
  annual additional rent ÷ median gross annual earnings × 100
```

The earnings denominator is ASHE resident-based median gross annual earnings for
full-time Lewisham workers. It is a benchmark for one full-time resident, not a
measure of household income. Spreadsheet-derived step and percentage columns
from the supplied workbook export are not retained or used.

PIPR measures average rents in the private rental market. Those rents are not
the planning-defined affordable housing counted in `data/developments.json`.

The main comparable annual period is **2015–2025**. The source extract includes
January–July 2026, but 2026 is excluded because it is not a complete calendar
year. The builder fails if a required raw field, month or earnings observation
is absent, or if derived annual costs and percentages fail reconciliation.

The supplied file and existing repository documentation did not include exact
PIPR or ASHE source URLs. Their provenance entries are therefore marked
`verification_required` rather than assigning unverified links. Those URLs must
be confirmed before the series is published on the public page.

## Running the data fetch

```bash
python3 -m venv .venv
.venv/bin/pip install requests pandas
.venv/bin/python fetch_data.py     # census tables, boundaries, lookup
.venv/bin/python fetch_names.py    # House of Commons Library MSOA names
.venv/bin/python fetch_developments.py   # GLA Planning London Datahub completions
.venv/bin/python build_developments.py   # -> data/developments.json
.venv/bin/python build_access_to_space.py # -> data/access_to_space.json
```

Raw downloads are cached to `data/raw/`, so reruns do not re-hit the APIs.
Nothing is fabricated, interpolated or filled — a failed fetch raises.
