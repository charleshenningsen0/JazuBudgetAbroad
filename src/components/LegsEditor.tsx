import type { TripLeg } from '../lib/calc'
import { DestinationPicker } from './DestinationPicker'
import { NumberField } from './NumberField'
import { IconPlus, IconTrash } from './Icons'

interface Props {
  legs: TripLeg[]
  onChange: (legs: TripLeg[]) => void
  /** Cost of each leg, used for the mini bar. */
  legCosts: number[]
  totalDays: number
}

let legCounter = 0
function nextLegId(): string {
  legCounter += 1
  return `leg-${Date.now().toString(36)}-${legCounter}`
}

export function LegsEditor({ legs, onChange, legCosts, totalDays }: Props) {
  function updateLeg(index: number, patch: Partial<TripLeg>) {
    onChange(legs.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)))
  }

  function removeLeg(index: number) {
    if (legs.length <= 1) return
    onChange(legs.filter((_, i) => i !== index))
  }

  function moveLeg(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= legs.length) return
    const next = [...legs]
    const [moved] = next.splice(index, 1)
    next.splice(target, 0, moved)
    onChange(next)
  }

  function addLeg() {
    const last = legs[legs.length - 1]
    onChange([
      ...legs,
      { id: nextLegId(), destinationId: last?.destinationId ?? 'rome', days: 7 },
    ])
  }

  const maxCost = Math.max(...legCosts, 1)

  return (
    <div className="field">
      <div className="field-head">
        <span className="field-label">Destinations &amp; length of stay</span>
        <span className="field-hint">{totalDays} days in total</span>
      </div>

      <ul className="legs">
        {legs.map((leg, index) => {
          const cost = legCosts[index] ?? 0
          return (
            <li key={leg.id} className="leg">
              <div className="leg-head">
                <span className="leg-badge">{index + 1}</span>
                <span className="leg-label">Stop {index + 1}</span>
                <span className="leg-tools">
                  <button
                    type="button"
                    className="icon-btn"
                    title="Move earlier"
                    aria-label={`Move stop ${index + 1} earlier`}
                    disabled={index === 0}
                    onClick={() => moveLeg(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Move later"
                    aria-label={`Move stop ${index + 1} later`}
                    disabled={index === legs.length - 1}
                    onClick={() => moveLeg(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    title="Remove this stop"
                    aria-label={`Remove stop ${index + 1}`}
                    disabled={legs.length <= 1}
                    onClick={() => removeLeg(index)}
                  >
                    <IconTrash />
                  </button>
                </span>
              </div>

              <DestinationPicker
                value={leg.destinationId}
                onChange={(destinationId) => updateLeg(index, { destinationId })}
              />

              <div className="leg-meta">
                <NumberField
                  id={`leg-days-${leg.id}`}
                  value={leg.days}
                  min={1}
                  max={1095}
                  suffix={leg.days === 1 ? 'day' : 'days'}
                  onChange={(days) => updateLeg(index, { days })}
                />
                <div className="leg-cost">
                  <span className="leg-bar">
                    <span
                      className="leg-bar-fill"
                      style={{ width: `${Math.max(3, (cost / maxCost) * 100)}%` }}
                    />
                  </span>
                  <span className="leg-cost-value">{formatCost(cost)}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <button type="button" className="btn btn--dashed" onClick={addLeg}>
        <IconPlus />
        Add another destination
      </button>
    </div>
  )
}

function formatCost(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`
}
