import { TIERS } from '../data/tiers'
import type { TierId } from '../data/tiers'

interface Props {
  value: TierId
  onChange: (id: TierId) => void
}

export function TierSelector({ value, onChange }: Props) {
  return (
    <div className="field">
      <label className="field-label">How do you like to travel?</label>
      <div className="tiers" role="radiogroup" aria-label="Spending tier">
        {TIERS.map((tier) => {
          const active = tier.id === value
          return (
            <button
              key={tier.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`tier ${active ? 'tier--active' : ''}`}
              style={{ '--tier-accent': tier.accent } as React.CSSProperties}
              onClick={() => onChange(tier.id)}
            >
              <span className="tier-dot" />
              <span className="tier-text">
                <span className="tier-name">{tier.name}</span>
                <span className="tier-tagline">{tier.tagline}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
