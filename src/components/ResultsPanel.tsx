import type { TripEstimate } from '../lib/calc'
import { formatLocal, formatUSD, describeDuration } from '../lib/format'
import { BreakdownBars } from './BreakdownBars'
import { IconPlane, IconShield, IconStamp, IconSparkle } from './Icons'

interface Props {
  estimate: TripEstimate
  tips: Array<{ title: string; detail: string; tone: 'save' | 'info' }>
}

const ONE_OFF_ICONS: Record<string, React.ReactNode> = {
  airfare: <IconPlane />,
  visa: <IconStamp />,
  insurance: <IconShield />,
  setup: <IconSparkle />,
}

export function ResultsPanel({ estimate, tips }: Props) {
  const { destination, tier, inputs } = estimate
  const days = inputs.days

  return (
    <div className="results-inner">
      <section className="card card--headline">
        <p className="headline-eyebrow">
          {destination.city}, {destination.country} &middot; {describeDuration(days)} &middot;{' '}
          {tier.name}
        </p>
        <p className="headline-amount">
          {formatUSD(estimate.grandTotal)}
          <span className="headline-caption">
            {inputs.travelers > 1 ? 'total for the group' : 'total suggested spend'}
          </span>
        </p>

        <div className="stat-grid">
          <div className="stat">
            <span className="stat-value">{formatUSD(estimate.perTraveler)}</span>
            <span className="stat-label">per traveler</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatUSD(estimate.perDay)}</span>
            <span className="stat-label">per day</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatUSD(estimate.perWeek)}</span>
            <span className="stat-label">per week</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatUSD(estimate.perMonth)}</span>
            <span className="stat-label">per month</span>
          </div>
        </div>

        <p className="headline-local">
          About{' '}
          <strong>
            {formatLocal(estimate.local.amount, estimate.local.symbol)}
          </strong>{' '}
          ({estimate.local.currency}) at today&rsquo;s rate &middot; check the rate before you go
        </p>
      </section>

      <section className="card">
        <h3 className="card-title">Where the money goes</h3>
        <BreakdownBars
          categories={estimate.categories}
          livingTotal={estimate.livingTotal}
          days={days}
        />
      </section>

      <section className="card">
        <h3 className="card-title">One-off costs</h3>
        {estimate.oneOffs.length === 0 ? (
          <p className="muted">No one-off costs selected.</p>
        ) : (
          <ul className="onoff-list">
            {estimate.oneOffs.map((o) => (
              <li key={o.key} className="onoff-row">
                <span className={`onoff-icon onoff-icon--${o.key}`}>
                  {ONE_OFF_ICONS[o.key] ?? <IconSparkle />}
                </span>
                <span className="onoff-label">{o.label}</span>
                <span className="onoff-amount">{formatUSD(o.amount)}</span>
              </li>
            ))}
            <li className="onoff-row onoff-row--total">
              <span className="onoff-icon">
                <IconSparkle />
              </span>
              <span className="onoff-label">Emergency buffer ({Math.round(tier.contingency * 100)}%)</span>
              <span className="onoff-amount">{formatUSD(estimate.contingency)}</span>
            </li>
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="card-title">Saving tips for {destination.city}</h3>
        <ul className="tips">
          {tips.map((t) => (
            <li key={t.title} className={`tip tip--${t.tone}`}>
              <span className="tip-title">{t.title}</span>
              <span className="tip-detail">{t.detail}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
