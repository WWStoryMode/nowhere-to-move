import { n } from './format.js'

// Builds a plain-English line from one area's numbers. Every branch is chosen
// from the actual signs of the three deltas, so the sentence is always true of
// the figures printed beside it. It describes arithmetic only - it never claims
// anyone moved, because this data cannot show that.
export function narrative(a) {
  const { totalChange, countChange, rateChange, oc11, oc21 } = a
  const flat = Math.abs(rateChange) < 0.05

  const households =
    totalChange > 0 ? `Added ${n(totalChange)} households.`
    : totalChange < 0 ? `Lost ${n(Math.abs(totalChange))} households.`
    : 'The number of households did not change.'

  const overcrowded =
    countChange > 0 ? `Overcrowded families rose from ${n(oc11)} to ${n(oc21)}`
    : countChange < 0 ? `Overcrowded families fell from ${n(oc11)} to ${n(oc21)}`
    : `Overcrowded families stayed at ${n(oc11)}`

  let rate
  if (flat) {
    rate = ', and the rate barely moved.'
  } else if (countChange > 0 && rateChange < 0) {
    rate = ', but the rate fell because the area grew faster.'
  } else if (countChange > 0 && rateChange > 0) {
    rate = ', and the rate rose with it.'
  } else if (countChange < 0 && rateChange < 0) {
    rate = ', and the rate fell with it.'
  } else if (countChange < 0 && rateChange > 0) {
    rate = ', but the rate still rose because the area shrank faster.'
  } else if (countChange === 0 && rateChange < 0) {
    rate = ', but the rate fell because the area grew around them.'
  } else {
    rate = ', but the rate rose because the area shrank around them.'
  }

  return `${households} ${overcrowded}${rate}`
}
