import type { ReactNode } from 'react'
import type { TripEstimate } from '../lib/calc'
import { formatLocal, formatNumber, formatUSD } from '../lib/format'
import { BreakdownBars } from './BreakdownBars'
import { IconPlane, IconShield, IconSparkle, IconStamp, IconTag } from './Icons'

interface Props {
  estimate: TripEstimate
  tips: Array<{ title: string; detail: string; tone: 'save' | 'info' }>
}

const ONE_OFF_ICONS: Record<string, ReactNode> = {
  airfare: <IconPlane />,
  visa: <IconStamp />,
  insurance: <IconShield />,
  setup: <IconSparkle />,
}

export function ResultsPanel({ estimate, tips }: Props) {
  const { tier, inputs, totalDays } = estimate
  const multi = estimate.legs.length > 1

  return (
    <div className="results-inner">
      <section className="card card--headline">
        <p className="headline-eyebrow">
          {multi
            ? estimate.legs.map((l) => l.destination.city).join(' → ')
            : `${estimate.legs[0]?.destination.city}, ${estimate.legs[0]?.destination.country}`}{' '}
          &middot; {formatNumber(totalDays)} days &middot; {tier.name}
        </p>
        <p className="headline-amount">
          {formatUSD(estimate.grandTotal)}
          <span className="headline-caption">
            {multi
              ? `total across ${estimate.legs.length} destinations`
              : inputs.travelers > 1
                ? 'total for the group'
                : 'total suggested spend'}
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

        {estimate.local && (
          <p className="headline-local">
            About{' '}
            <strong>{formatLocal(estimate.local.amount, estimate.local.symbol)}</strong> (
            {estimate.local.currency}) at today&rsquo;s rate &middot; check the rate before you go
          </p>
        )}

        {multi && (
          <p className="headline-local">
            Local currency totals for each stop are shown in the breakdown below.
          </p>
        )}

        {estimate.excludedCategories.length > 0 && (
          <p className="headline-local headline-local--muted">
            {estimate.excludedCategories.length} categor
            {estimate.excludedCategories.length === 1 ? 'y is' : 'ies are'} left out of this
            calculation.
          </p>
        )}
      </section>

      {multi && (
        <section className="card">
          <h3 className="card-title">Trip by destination</h3>
          <ul className="leg-breakdown">
            {estimate.legs.map((leg, index) => (
              <li key={leg.legId} className="leg-breakdown-row">
                <span className="leg-breakdown-badge">{index + 1}</span>
                <span className="leg-breakdown-body">
                  <span className="leg-breakdown-top">
                    <span className="leg-breakdown-city">{leg.destination.city}</span>
                    <span className="leg-breakdown-amount">{formatUSD(leg.amount)}</span>
                  </span>
                  <span className="leg-breakdown-bar">
                    <span
                      className="leg-breakdown-fill"
                      style={{ width: `${Math.max(3, leg.share * 100)}%` }}
                    />
                  </span>
                  <span className="leg-breakdown-sub">
                    {formatNumber(leg.days)} days &middot; {formatUSD(leg.amount / leg.days)}/day
                    &middot; {formatLocal(leg.localAmount, leg.destination.symbol)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3 className="card-title">Where the money goes</h3>
        {estimate.categories.length === 0 ? (
          <p className="muted">No cost categories selected — add some below the form.</p>
        ) : (
          <BreakdownBars
            categories={estimate.categories}
            livingTotal={estimate.livingTotal}
            days={totalDays}
          />
        )}
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
                  {ONE_OFF_ICONS[o.key] ?? <IconTag />}
                </span>
                <span className="onoff-label">{o.label}</span>
                <span className="onoff-amount">{formatUSD(o.amount)}</span>
              </li>
            ))}
            <li className="onoff-row onoff-row--total">
              <span className="onoff-icon">
                <IconSparkle />
              </span>
              <span className="onoff-label">
                Emergency buffer ({Math.round(tier.contingency * 100)}%)
              </span>
              <span className="onoff-amount">{formatUSD(estimate.contingency)}</span>
            </li>
          </ul>
        )}
      </section>

      <section className="card">
        <h3 className="card-title">Saving tips</h3>
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
