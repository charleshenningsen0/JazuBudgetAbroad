import { useState } from 'react'

interface Props {
  value: number | null
  onChange: (value: number | null) => void
}

/**
 * Budget input that can be empty (meaning "no budget set yet").
 */
export function BudgetField({ value, onChange }: Props) {
  const [text, setText] = useState(value === null ? '' : String(value))

  function handle(raw: string) {
    setText(raw)
    if (raw.trim() === '') {
      onChange(null)
      return
    }
    const n = Number(raw)
    if (Number.isFinite(n)) onChange(n)
  }

  return (
    <div className="row">
      <input
        id="budget"
        className="input input--number"
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="e.g. 6000"
        value={text}
        onChange={(e) => handle(e.target.value)}
        onBlur={() => {
          if (text.trim() === '') onChange(null)
        }}
      />
      <span className="input-suffix">USD for the whole trip</span>
    </div>
  )
}
