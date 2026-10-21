import { CATEGORIES } from '../data/categories'
import type { CategoryKey } from '../data/categories'
import { IconCheck } from './Icons'

interface Props {
  value: CategoryKey[]
  onChange: (keys: CategoryKey[]) => void
}

export function CategorySelector({ value, onChange }: Props) {
  const selected = new Set(value)

  function toggle(key: CategoryKey) {
    const next = selected.has(key)
      ? value.filter((k) => k !== key)
      : [...value, key]
    onChange(next)
  }

  const allOn = selected.size === CATEGORIES.length

  return (
    <div className="field">
      <div className="field-head">
        <span className="field-label">What should I calculate?</span>
        <button
          type="button"
          className="link-btn"
          onClick={() => onChange(allOn ? [] : CATEGORIES.map((c) => c.key))}
        >
          {allOn ? 'Clear all' : 'Select all'}
        </button>
      </div>

      <div className="category-grid">
        {CATEGORIES.map((cat) => {
          const on = selected.has(cat.key)
          return (
            <button
              key={cat.key}
              type="button"
              className={`category ${on ? 'category--on' : ''}`}
              aria-pressed={on}
              onClick={() => toggle(cat.key)}
            >
              <span className="category-check">{on && <IconCheck />}</span>
              <span className="category-text">
                <span className="category-label">{cat.label}</span>
                <span className="category-blurb">{cat.blurb}</span>
              </span>
            </button>
          )
        })}
      </div>

      {selected.size === 0 && (
        <p className="hint hint--warn">
          No built-in categories selected — add your own costs below to get a total.
        </p>
      )}
    </div>
  )
}
