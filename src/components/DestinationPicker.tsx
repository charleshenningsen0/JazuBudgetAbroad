import { useEffect, useMemo, useRef, useState } from 'react'
import { DESTINATIONS, REGIONS } from '../data/destinations'
import type { Destination, Region } from '../data/destinations'
import { IconSearch } from './Icons'

interface Props {
  value: string
  onChange: (id: string) => void
}

const ALL = 'All regions'

export function DestinationPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [region, setRegion] = useState<string>(ALL)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [filterKey, setFilterKey] = useState(`${query}|${region}`)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(
    () => DESTINATIONS.find((d) => d.id === value) ?? DESTINATIONS[0],
    [value],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return DESTINATIONS.filter((d) => {
      const inRegion = region === ALL || d.region === region
      if (!inRegion) return false
      if (!q) return true
      return (
        d.city.toLowerCase().includes(q) ||
        d.country.toLowerCase().includes(q) ||
        d.region.toLowerCase().includes(q)
      )
    })
  }, [query, region])

  // Reset the highlighted row whenever the filters change. Adjusting state
  // during render avoids an extra effect-driven render pass.
  const nextFilterKey = `${query}|${region}`
  if (nextFilterKey !== filterKey) {
    setFilterKey(nextFilterKey)
    setHighlight(0)
  }

  // Close the dropdown when clicking outside of it.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function choose(d: Destination) {
    onChange(d.id)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setOpen(true)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const pick = results[highlight]
      if (pick) choose(pick)
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className="field" ref={rootRef}>
      <label className="field-label" htmlFor="destination-search">
        Where are you going?
      </label>

      <div className={`picker ${open ? 'picker--open' : ''}`}>
        <div className="picker-value" onClick={() => inputRef.current?.focus()}>
          <IconSearch className="picker-search-icon" />
          <input
            id="destination-search"
            ref={inputRef}
            className="picker-input"
            type="text"
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls="destination-listbox"
            placeholder={`${selected.city}, ${selected.country}`}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          {!query && <span className="picker-current">{selected.city}</span>}
        </div>

        {open && (
          <div className="picker-panel">
            <div className="picker-regions">
              {[ALL, ...REGIONS].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`chip ${region === r ? 'chip--active' : ''}`}
                  onClick={() => setRegion(r as Region | typeof ALL)}
                >
                  {r}
                </button>
              ))}
            </div>

            <ul className="picker-list" id="destination-listbox" role="listbox">
              {results.length === 0 && <li className="picker-empty">No destinations match.</li>}
              {results.map((d, i) => (
                <li key={d.id} role="option" aria-selected={d.id === selected.id}>
                  <button
                    type="button"
                    className={`picker-item ${i === highlight ? 'picker-item--active' : ''} ${
                      d.id === selected.id ? 'picker-item--selected' : ''
                    }`}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(d)}
                  >
                    <span className="picker-item-main">
                      <span className="picker-item-city">{d.city}</span>
                      <span className="picker-item-country">{d.country}</span>
                    </span>
                    <span className="picker-item-meta">
                      <span className="picker-item-region">{d.region}</span>
                      <span className="picker-item-currency">
                        {d.symbol} {d.currency}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
