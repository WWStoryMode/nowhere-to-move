export const n = (v) => v.toLocaleString('en-GB')
export const pct = (v) => `${v.toFixed(1)}%`
export const pct2 = (v) => `${v.toFixed(2)}%`
export const signed = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${n(Math.abs(v))}`
export const signedPp = (v) =>
  `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}pp`
