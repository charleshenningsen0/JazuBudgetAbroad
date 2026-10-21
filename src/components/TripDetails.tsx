import type { AirfareOption, TripInputs } from '../lib/calc'
import { NumberField } from './NumberField'

interface Props {
  inputs: TripInputs
  onChange: (patch: Partial<TripInputs>) => void
}

const LENGTH_PRESETS = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
  { label: 'Semester', days: 120 },
  { label: '1 year', days: 365 },
]

const AIRFARE_OPTIONS: Array<{ value: AirfareOption; label: string }> = [
  { value: 'none', label: 'No flights' },
  { value: 'oneway', label: 'One-way' },
  { value: 'roundtrip', label: 'Round-trip' },
]

export function TripDetails({ inputs, onChange }: Props) {
  return (
    <div className="details">
      <div className="field">
        <label className="field-label" htmlFor="days">
          How long are you staying?
        </label>
        <NumberField
          id="days"
          value={inputs.days}
          min={1}
          max={1095}
          suffix="days"
          onChange={(days) => onChange({ days })}
        />
        <div className="presets">
          {LENGTH_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              className={`chip ${inputs.days === p.days ? 'chip--active' : ''}`}
              onClick={() => onChange({ days: p.days })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="field-label" htmlFor="travelers">
          How many students are sharing?
        </label>
        <NumberField
          id="travelers"
          value={inputs.travelers}
          min={1}
          max={50}
          suffix={inputs.travelers === 1 ? 'person' : 'people'}
          onChange={(travelers) => onChange({ travelers })}
        />
      </div>

      <div className="field">
        <span className="field-label">Flights</span>
        <div className="segmented">
          {AIRFARE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`segment ${inputs.airfare === o.value ? 'segment--active' : ''}`}
              onClick={() => onChange({ airfare: o.value })}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Don't forget</span>
        <div className="switches">
          <label className="switch">
            <input
              type="checkbox"
              checked={inputs.includeVisa}
              onChange={(e) => onChange({ includeVisa: e.target.checked })}
            />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
            <span className="switch-label">Visa &amp; entry fees</span>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={inputs.includeInsurance}
              onChange={(e) => onChange({ includeInsurance: e.target.checked })}
            />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
            <span className="switch-label">Travel insurance</span>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={inputs.includeSetup}
              onChange={(e) => onChange({ includeSetup: e.target.checked })}
            />
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
            <span className="switch-label">Setup &amp; gear budget</span>
          </label>
        </div>
      </div>
    </div>
  )
}
