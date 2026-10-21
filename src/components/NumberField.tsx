import { useState } from 'react'

interface Props {
  id: string
  value: number
  min: number
  max: number
  suffix: string
  onChange: (value: number) => void
}

/**
 * A number input that keeps its own text state, so the field can be cleared
 * and retyped without the value snapping back to the minimum.
 */
export function NumberField({ id, value, min, max, suffix, onChange }: Props) {
  const [text, setText] = useState(String(value))
  const [lastValue, setLastValue] = useState(value)

  // Follow external changes (e.g. the "1 month" preset buttons) by adjusting
  // state during render rather than in an effect.
  if (value !== lastValue) {
    setLastValue(value)
    setText((prev) => (Number(prev) === value ? prev : String(value)))
  }

  function commit(raw: string) {
    setText(raw)
    if (raw.trim() === '') return
    const n = Number(raw)
    if (!Number.isFinite(n)) return
    onChange(Math.min(max, Math.max(min, Math.round(n))))
  }

  function onBlur() {
    const n = Number(text)
    if (text.trim() === '' || !Number.isFinite(n)) {
      setText(String(value))
      return
    }
    const clamped = Math.min(max, Math.max(min, Math.round(n)))
    setText(String(clamped))
    onChange(clamped)
  }

  return (
    <div className="row">
      <input
        id={id}
        className="input input--number"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        onChange={(e) => commit(e.target.value)}
        onBlur={onBlur}
      />
      <span className="input-suffix">{suffix}</span>
    </div>
  )
}
