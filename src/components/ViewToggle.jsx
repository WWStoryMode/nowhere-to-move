import { VIEWS, VIEW_ORDER } from '../lib/palette.js'

export default function ViewToggle({ value, onChange }) {
  return (
    <div className="toggle" role="tablist" aria-label="Map view">
      {VIEW_ORDER.map((id) => {
        const v = VIEWS[id]
        const active = id === value
        return (
          <button
            key={id}
            role="tab"
            aria-selected={active}
            className={`toggle-btn${active ? ' is-active' : ''}${id === 'countChange' ? ' toggle-btn--lead' : ''}`}
            onClick={() => onChange(id)}
          >
            <span className="toggle-btn-label">{v.short}</span>
            {id === 'countChange' && <span className="toggle-flag">the real measure</span>}
          </button>
        )
      })}
    </div>
  )
}
