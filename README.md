# Nowhere to Move

Evidence pack for the **Save Lewisham Shopping Centre** campaign.

Measures how household overcrowding changed across Lewisham between the 2011
and 2021 censuses at MSOA level, to test whether the consented Landsec scheme
(1,744 homes, 329 "affordable", mostly 1–2 bed) matches where family-sized need
actually is.

## The headline

| | 2011 | 2021 | Change |
|---|---|---|---|
| Overcrowded households | 14,018 | 13,964 | **−54** |
| All households | 116,091 | 122,390 | **+6,299** |
| Overcrowding rate | 12.08% | 11.41% | −0.67pp |

The **rate** fell only because the denominator grew. The **count** of
overcrowded households was flat. Roughly 6,300 new households arrived and the
number of overcrowded families did not move.

Rate and count must always be read together. A rate quoted alone tells the
opposite story.

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

## The page

A single-page Vite + React choropleth of overcrowding by MSOA.

```bash
nvm use                 # Node 20.20.2 - the system Node 14 is too old for Vite
npm install
npm run dev             # local development
npm run build           # -> dist/index.html
```

`npm run build` emits **one self-contained `dist/index.html`** (~490 KB). Every
asset and both data files are inlined, so it opens offline straight from the
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

### Development annotations

`data/developments.json` is an optional overlay, empty (`{}`) by default. Keyed
by the area code used in the like-for-like table:

```json
{
  "E02000653": [
    { "name": "", "year": 2024, "homes": 0, "note": "", "source_url": "https://…" }
  ]
}
```

Only entries with a non-empty `source_url` are ever rendered, and each one shows
its source as a link. An empty, missing or malformed file renders nothing at all
— no heading, no placeholder. Because data is inlined at build time, filling this
in requires re-running `npm run build`.

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

## Running the data fetch

```bash
python3 -m venv .venv
.venv/bin/pip install requests pandas
.venv/bin/python fetch_data.py     # census tables, boundaries, lookup
.venv/bin/python fetch_names.py    # House of Commons Library MSOA names
.venv/bin/python fetch_developments.py   # GLA Planning London Datahub completions
.venv/bin/python build_developments.py   # -> data/developments.json
```

Raw downloads are cached to `data/raw/`, so reruns do not re-hit the APIs.
Nothing is fabricated, interpolated or filled — a failed fetch raises.
