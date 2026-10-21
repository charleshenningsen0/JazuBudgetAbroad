import { useState } from 'react'
import type { CustomCost } from '../lib/calc'
import { IconPlus, IconTrash } from './Icons'

interface Props {
  costs: CustomCost[]
  onChange: (costs: CustomCost[]) => void
}

let counter = 0
function nextId(): string {
  counter += 1
  return `c${Date.now().toString(36)}${counter}`
}

export function CustomCostsEditor({ costs, onChange }: Props) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState<'total' | 'daily'>('total')

  function add() {
    const cleanLabel = label.trim()
    const value = Number(amount)
    if (!cleanLabel || !Number.isFinite(value) || value <= 0) return
    onChange([
      ...costs,
      { id: nextId(), label: cleanLabel, amount: value, mode, enabled: true },
    ])
    setLabel('')
    setAmount('')
  }

  function update(id: string, patch: Partial<CustomCost>) {
    onChange(costs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function remove(id: string) {
    onChange(costs.filter((c) => c.id !== id))
  }

  return (
    <div className="field">
      <span className="field-label">Extra costs you add yourself</span>

      {costs.length === 0 ? (
        <p className="hint">
          Add anything the calculator does not cover — souvenirs, a hostel upgrade, shopping,
          course fees, a SIM card, or a birthday dinner.
        </p>
      ) : (
        <ul className="custom-list">
          {costs.map((cost) => (
            <li key={cost.id} className={`custom-row ${cost.enabled ? '' : 'custom-row--off'}`}>
              <label className="switch switch--tight">
                <input
                  type="checkbox"
                  checked={cost.enabled}
                  onChange={(e) => update(cost.id, { enabled: e.target.checked })}
                />
                <span className="switch-track" aria-hidden="true">
                  <span className="switch-thumb" />
                </span>
              </label>

              <span className="custom-label">{cost.label}</span>

              <span className="custom-amount">
                <span className="custom-amount-prefix">$</span>
                <input
                  className="input input--tiny"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={cost.amount}
                  aria-label={`${cost.label} amount in dollars`}
                  onChange={(e) =>
                    update(cost.id, {
                      amount: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              </span>

              <select
                className="select select--tiny"
                value={cost.mode}
                aria-label={`${cost.label} charged how`}
                onChange={(e) => update(cost.id, { mode: e.target.value as 'total' | 'daily' })}
              >
                <option value="total">one-off</option>
                <option value="daily">per day</option>
              </select>

              <button
                type="button"
                className="icon-btn icon-btn--danger"
                title="Remove"
                aria-label={`Remove ${cost.label}`}
                onClick={() => remove(cost.id)}
              >
                <IconTrash />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="custom-add">
        <input
          className="input"
          type="text"
          placeholder="Cost name — e.g. Souvenirs"
          value={label}
          aria-label="New cost name"
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <input
          className="input input--tiny input--amount"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="0"
          value={amount}
          aria-label="New cost amount in dollars"
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
        />
        <select
          className="select"
          value={mode}
          aria-label="New cost charged how"
          onChange={(e) => setMode(e.target.value as 'total' | 'daily')}
        >
          <option value="total">one-off</option>
          <option value="daily">per day</option>
        </select>
        <button type="button" className="btn btn--primary btn--compact" onClick={add}>
          <IconPlus />
          Add
        </button>
      </div>
    </div>
  )
}
