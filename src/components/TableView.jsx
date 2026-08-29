import { useState } from 'react'
import { areas } from '../lib/data.js'
import { n, pct2, signed, signedPp } from '../lib/format.js'

// Backs the map so identity is never carried by colour alone, and satisfies the
// relief rule for the sub-3:1 light steps in the diverging ramp.
const COLS = [
  { key: 'name', label: 'Area', type: 'text' },
  { key: 'oc11', label: 'Overcrowded 2011', type: 'n' },
  { key: 'oc21', label: 'Overcrowded 2021', type: 'n' },
  { key: 'countChange', label: 'Change', type: 'signed' },
  { key: 'rate11', label: 'Rate 2011', type: 'pct' },
  { key: 'rate21', label: 'Rate 2021', type: 'pct' },
  { key: 'rateChange', label: 'Change', type: 'pp' },
  { key: 'tot11', label: 'Households 2011', type: 'n' },
  { key: 'tot21', label: 'Households 2021', type: 'n' },
  { key: 'totalChange', label: 'Change', type: 'signed' },
]

export default function TableView({ onSelect }) {
  const [sort, setSort] = useState({ key: 'countChange', dir: 'desc' })
  const rows = [...areas].sort((a, b) => {
    const x = a[sort.key], y = b[sort.key]
    const c = typeof x === 'string' ? x.localeCompare(y) : x - y
    return sort.dir === 'asc' ? c : -c
  })

  const fmt = (v, type) =>
    type === 'n' ? n(v) : type === 'pct' ? pct2(v) : type === 'pp' ? signedPp(v)
    : type === 'signed' ? signed(v) : v

  return (
    <section className="section">
      <h2>Every area, in numbers</h2>
      <p className="section-lede">
        The same figures behind the map. Counts and rates sit side by side in every row.
        Click a column to sort, or a row to show that area on the map.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {COLS.map((c, i) => (
                <th
                  key={c.key + i}
                  scope="col"
                  aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <button
                    onClick={() =>
                      setSort((s) => ({
                        key: c.key,
                        dir: s.key === c.key && s.dir === 'desc' ? 'asc' : 'desc',
                      }))
                    }
                  >
                    {c.label}
                    {sort.key === c.key && <span aria-hidden="true">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} onClick={() => onSelect(r.code)} tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelect(r.code)}>
                {COLS.map((c, i) => (
                  <td key={c.key + i} className={
                    // Only overcrowding deltas are polar. totalChange stays neutral.
                    (c.key === 'countChange' || c.key === 'rateChange')
                      ? (r[c.key] > 0 ? 'is-worse' : r[c.key] < 0 ? 'is-better' : '')
                      : ''
                  }>
                    {fmt(r[c.key], c.type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="table-note">
        Colour on “Households change” is neutral — more households is neither good nor bad
        in itself. On the overcrowding columns, red marks a worsening and blue an improvement.
      </p>
    </section>
  )
}
