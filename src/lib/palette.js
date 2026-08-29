// Palette per the dataviz method. The diverging pair is the documented
// blue <-> red with a neutral midpoint; the red arm is derived in OKLCH at the
// documented blue ramp's exact lightness steps (matched to within 0.0011 L).
//
// Validated with the skill's scripts/validate_palette.js:
//   CVD separation  13.9 light (deutan) / 17.8 dark (protan)   floor 8   PASS
//   Normal-vision   16.0 light / 19.2 dark                     floor 15  PASS
//   Lightness       monotonic on each arm, min step 0.140      PASS
// The validator's lightness-band and chroma-floor checks are categorical gates
// and do not apply here - a diverging ramp requires a near-neutral light
// midpoint by construction. Its own scope note says so. The contrast WARN
// obligates relief, which the legend, hover tooltips and table view provide.

const BLUE_DARK = '#184f95'
const BLUE_MID = '#3987e5'
const BLUE_LIGHT = '#9ec5f4'
const RED_LIGHT = '#f1aea8'
const RED_MID = '#d75853'
const RED_DARK = '#892b2a'

export const NEUTRAL_LIGHT = '#f0efec'
export const NEUTRAL_DARK = '#383835'

// index 0 = most improved, 6 = most worsened
export const diverging = (neutral) => [
  BLUE_DARK, BLUE_MID, BLUE_LIGHT, neutral, RED_LIGHT, RED_MID, RED_DARK,
]

// Sequential red for the 2021 rate: it is magnitude, not polarity, and higher
// always means worse - so it stays in the red family rather than flipping to
// the default blue, which would read as "good" everywhere else on this page.
export const SEQ_RED = ['#fad6d2', '#f1aea8', '#e4857e', '#d75853', '#b13f3c', '#892b2a']

function classify(value, breaks) {
  for (let i = 0; i < breaks.length; i++) if (value < breaks[i]) return i
  return breaks.length
}

export const VIEWS = {
  countChange: {
    id: 'countChange',
    label: 'Change in overcrowded households',
    short: 'Change in count',
    blurb: 'How many more or fewer households were overcrowded in 2021 than in 2011.',
    kind: 'diverging',
    accessor: (a) => a.countChange,
    breaks: [-100, -50, -10, 10, 50, 100],
    legend: ['100+ fewer', '50–99 fewer', '10–49 fewer', 'Within ±10', '10–49 more', '50–99 more', '100+ more'],
    format: (v) => (v > 0 ? `+${v}` : `${v}`),
    unit: 'households',
  },
  rateChange: {
    id: 'rateChange',
    label: 'Change in overcrowding rate',
    short: 'Change in rate',
    blurb: 'Percentage-point change in the share of households that are overcrowded.',
    kind: 'diverging',
    accessor: (a) => a.rateChange,
    breaks: [-3, -1.5, -0.5, 0.5, 1.5, 3],
    legend: ['−3.0 or less', '−3.0 to −1.5', '−1.5 to −0.5', 'Within ±0.5', '+0.5 to +1.5', '+1.5 to +3.0', '+3.0 or more'],
    format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}pp`,
    unit: 'percentage points',
  },
  rate2021: {
    id: 'rate2021',
    label: '2021 overcrowding rate',
    short: '2021 rate',
    blurb: 'Share of households that were overcrowded in 2021.',
    kind: 'sequential',
    accessor: (a) => a.rate21,
    breaks: [7, 9, 11, 13, 16],
    legend: ['Under 7%', '7–9%', '9–11%', '11–13%', '13–16%', '16% and over'],
    format: (v) => `${v.toFixed(1)}%`,
    unit: 'of households',
  },
}

export const VIEW_ORDER = ['countChange', 'rateChange', 'rate2021']

export function colourFor(view, area, dark) {
  const v = view.accessor(area)
  if (v === null || v === undefined || Number.isNaN(v)) return null
  const ramp = view.kind === 'sequential'
    ? SEQ_RED
    : diverging(dark ? NEUTRAL_DARK : NEUTRAL_LIGHT)
  return ramp[classify(v, view.breaks)]
}

export function rampFor(view, dark) {
  return view.kind === 'sequential'
    ? SEQ_RED
    : diverging(dark ? NEUTRAL_DARK : NEUTRAL_LIGHT)
}

// Bedroom count is ORDINAL - more bedrooms, darker step - so it takes a
// single-hue ramp, not the map's diverging red/blue (which means improved or
// worsened elsewhere on this page and would misread as a value judgement here).
// Both ramps pass the skill's --ordinal gates: lightness monotone, adjacent
// dL >= 0.06, light end clears the surface, hue spread 3 degrees.
export const BEDROOM_RAMP_LIGHT = ['#86b6ef', '#5598e7', '#2a78d6', '#1c5cab', '#104281']
export const BEDROOM_RAMP_DARK = ['#b7d3f6', '#86b6ef', '#5598e7', '#2a78d6', '#1c5cab']
export const BEDROOM_KEYS = ['1', '2', '3', '4', '5plus']
export const BEDROOM_LABELS = {
  '1': '1 bed or studio', '2': '2 bed', '3': '3 bed', '4': '4 bed', '5plus': '5+ bed',
}
export const bedroomRamp = (dark) => (dark ? BEDROOM_RAMP_DARK : BEDROOM_RAMP_LIGHT)
