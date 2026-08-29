// All data is imported at build time, never fetched at runtime, so the built
// page works offline straight from the filesystem.
import lflCsv from '../../data/lewisham_overcrowding_like_for_like.csv?raw'
import geojsonRaw from '../../data/lewisham_msoa.geojson?raw'
import names from '../../data/msoa_names.json'
import developmentsRaw from '../../data/developments.json'
import accessToSpaceRaw from '../../data/access_to_space.json'
import provenance from '../../data/provenance.json'

function parseCsv(text) {
  const rows = []
  let row = [], field = '', quoted = false
  const src = text.replace(/\r\n/g, '\n').trim()
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  row.push(field); rows.push(row)
  const header = rows.shift()
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])))
}

const geojson = JSON.parse(geojsonRaw)

/** 36 logical areas keyed on the like-for-like table's key (the 2011 footprint). */
export const areas = parseCsv(lflCsv).map((r) => {
  const oc11 = +r.overcrowded_2011, oc21 = +r.overcrowded_2021
  const tot11 = +r.total_2011, tot21 = +r.total_2021
  const components = r.msoa21cd_components.split('|').filter(Boolean)
  return {
    code: r.msoa21cd,
    name: names[r.msoa21cd] || r.msoa21cd,
    censusName: r.msoa21nm,
    hasName: Boolean(names[r.msoa21cd]),
    oc11, oc21, tot11, tot21,
    rate11: +r.rate_2011,
    rate21: +r.rate_2021,
    rateChange: +r.rate_change_pp,
    countChange: oc21 - oc11,
    totalChange: tot21 - tot11,
    components,
    isSplit: r.chngind === 'S',
    componentNames: components.map((c) => names[c] || c),
  }
})

/** Polygon code -> logical area. Both children of the 2011 split point at the parent. */
export const areaByPolygon = (() => {
  const m = new Map()
  for (const a of areas) for (const c of a.components) m.set(c, a)
  return m
})()

export const boundaries = geojson

// Fail loudly rather than rendering a quietly incomplete map.
;(() => {
  if (areas.length !== 36) throw new Error(`Expected 36 areas, got ${areas.length}`)
  const feats = geojson.features
  if (feats.length !== 37) throw new Error(`Expected 37 polygons, got ${feats.length}`)
  const unmapped = feats.filter((f) => !areaByPolygon.has(f.properties.MSOA21CD))
  if (unmapped.length) {
    throw new Error(`Polygons with no data: ${unmapped.map((f) => f.properties.MSOA21CD)}`)
  }
  const covered = new Set(feats.map((f) => f.properties.MSOA21CD))
  for (const a of areas) {
    for (const c of a.components) {
      if (!covered.has(c)) throw new Error(`Area ${a.code} references missing polygon ${c}`)
    }
    if (!Number.isFinite(a.rate21) || !Number.isFinite(a.countChange)) {
      throw new Error(`Area ${a.code} has non-finite values`)
    }
  }
})()

const DEV_SPECIAL = new Set(['_summary', 'unassigned'])
const BEDS_SMALL = ['1', '2']
const BEDS_FAMILY = ['3', '4', '5plus']
const sumBeds = (o, keys) => keys.reduce((t, k) => t + (Number(o?.[k]) || 0), 0)

/**
 * Schemes by area code. Only entries carrying a non-empty source_url are shown.
 *
 * An area present in the file with an EMPTY array means "no completed scheme of
 * 20+ homes recorded here" - a finding, not missing data - so empty arrays are
 * preserved rather than dropped.
 */
export const developments = (() => {
  const out = new Map()
  try {
    const raw = developmentsRaw
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
    for (const [code, list] of Object.entries(raw)) {
      if (DEV_SPECIAL.has(code) || !Array.isArray(list)) continue
      out.set(code, list.filter(
        (d) => d && typeof d === 'object'
          && typeof d.source_url === 'string' && d.source_url.trim() !== ''
      ))
    }
  } catch {
    return new Map()
  }
  return out
})()

/** Borough-level rollup exactly as published in the data file. */
export const devSummary = (() => {
  const s = developmentsRaw && developmentsRaw._summary
  return s && typeof s === 'object' && !Array.isArray(s) ? s : null
})()

/** Per-area aggregates, computed once from the schemes themselves. */
export const devByArea = (() => {
  const out = new Map()
  for (const [code, list] of developments) {
    const a = { schemes: list.length, homes: 0, affordable: 0,
                beds12: 0, beds3plus: 0, beds3plusAffordable: 0 }
    for (const d of list) {
      a.homes += Number(d.homes) || 0
      a.affordable += Number(d.affordable_homes) || 0
      a.beds12 += sumBeds(d.bedrooms, BEDS_SMALL)
      a.beds3plus += sumBeds(d.bedrooms, BEDS_FAMILY)
      a.beds3plusAffordable += sumBeds(d.bedrooms_affordable, BEDS_FAMILY)
    }
    a.affordablePct = a.homes ? (100 * a.affordable) / a.homes : null
    out.set(code, a)
  }
  return out
})()

// The bedroom panel quotes _summary directly while the side panel recomputes
// from individual schemes. If those two ever disagree the page would state two
// different truths, so fail loudly rather than render the discrepancy.
;(() => {
  if (!devSummary || developments.size === 0) return
  const got = { homes_gained: 0, affordable_homes: 0, one_or_two_bed: 0,
                three_plus_bed: 0, three_plus_bed_affordable: 0 }
  for (const a of devByArea.values()) {
    got.homes_gained += a.homes
    got.affordable_homes += a.affordable
    got.one_or_two_bed += a.beds12
    got.three_plus_bed += a.beds3plus
    got.three_plus_bed_affordable += a.beds3plusAffordable
  }
  for (const [k, v] of Object.entries(got)) {
    if (Number(devSummary[k]) !== v) {
      throw new Error(`developments: schemes sum ${k} to ${v} but _summary says ${devSummary[k]}`)
    }
  }
})()

export const retrievalDate = (() => {
  const dates = (Array.isArray(provenance) ? provenance : [])
    .map((p) => p.retrieved)
    .filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d))
    .sort()
  if (!dates.length) return null
  return new Date(dates[dates.length - 1]).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
})()

export const gainedLost = {
  gained: areas.filter((a) => a.totalChange > 0).length,
  lost: areas.filter((a) => a.totalChange < 0).length,
  unchanged: areas.filter((a) => a.totalChange === 0).length,
  ocRose: areas.filter((a) => a.countChange > 0).length,
  ocFell: areas.filter((a) => a.countChange < 0).length,
}

const ACCESS_YEARS = Array.from({ length: 11 }, (_, i) => 2015 + i)
const ACCESS_STEPS = {
  '1_to_2': '1→2 bedrooms',
  '2_to_3': '2→3 bedrooms',
  '3_to_4plus': '3→4+ bedrooms',
}

/**
 * Annual rent-step and earnings series, derived at build time by
 * build_access_to_space.py. Validate again at the application boundary so a
 * hand-edited or stale JSON file cannot quietly reach a future visualisation.
 */
export const accessToSpace = (() => {
  const rows = accessToSpaceRaw?.annual
  if (!Array.isArray(rows)) throw new Error('access to space: annual must be an array')
  if (rows.length !== ACCESS_YEARS.length) {
    throw new Error(`access to space: expected ${ACCESS_YEARS.length} annual rows, got ${rows.length}`)
  }

  rows.forEach((row, index) => {
    const expectedYear = ACCESS_YEARS[index]
    if (row?.year !== expectedYear) {
      throw new Error(`access to space: expected year ${expectedYear} at row ${index}`)
    }
    if (row.months !== 12) {
      throw new Error(`access to space: ${row.year} does not contain 12 published months`)
    }
    const earnings = Number(row.median_annual_gross_earnings_gbp)
    if (!Number.isFinite(earnings) || earnings <= 0) {
      throw new Error(`access to space: ${row.year} earnings are missing or zero`)
    }

    for (const [key, label] of Object.entries(ACCESS_STEPS)) {
      const step = row.steps?.[key]
      if (!step || step.label !== label) {
        throw new Error(`access to space: ${row.year} ${key} is missing or mislabelled`)
      }
      const monthly = Number(step.mean_monthly_additional_rent_gbp)
      const annual = Number(step.annual_additional_rent_gbp)
      const percentage = Number(step.percentage_of_earnings)
      if (![monthly, annual, percentage].every(Number.isFinite)) {
        throw new Error(`access to space: ${row.year} ${label} contains non-finite values`)
      }
      if (Math.abs(monthly * 12 - annual) > 0.01) {
        throw new Error(`access to space: ${row.year} ${label} annual rent arithmetic is inconsistent`)
      }
      if (Math.abs((annual / earnings) * 100 - percentage) > 0.000001) {
        throw new Error(`access to space: ${row.year} ${label} percentage is inconsistent`)
      }
    }
  })

  return { meta: accessToSpaceRaw._meta, annual: rows }
})()
