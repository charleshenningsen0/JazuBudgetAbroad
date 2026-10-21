import type { BudgetCheck } from '../lib/calc'
import { formatUSD } from '../lib/format'
import { IconCheck, IconWarning } from './Icons'

interface Props {
  check: BudgetCheck
}

export function BudgetCheckCard({ check }: Props) {
  const pct = Math.min(200, Math.round((check.budget / (check.budget - check.difference)) * 100))
  const used = Math.min(100, pct)

  return (
    <div className={`budget-check budget-check--${check.status}`}>
      <div className="budget-check-head">
        <span className="budget-check-title">
          {check.status === 'over' ? <IconWarning /> : <IconCheck />}
          {check.status === 'under'
            ? 'Within budget'
            : check.status === 'tight'
              ? 'Tight budget'
              : 'Over budget'}
        </span>
        <span className="budget-check-diff">
          {check.difference >= 0 ? '+' : '−'}
          {formatUSD(Math.abs(check.difference))}
        </span>
      </div>

      <div className="budget-check-bar">
        <span className="budget-check-fill" style={{ width: `${used}%` }} />
      </div>

      <p className="budget-check-message">{check.message}</p>

      {check.status !== 'under' && (
        <p className="budget-check-hint">
          {check.status === 'over'
            ? `Cut about ${formatUSD(Math.abs(check.perDayGap))} a day to land on budget.`
            : `That is only ${formatUSD(Math.abs(check.perDayGap))} a day of slack.`}
        </p>
      )}
    </div>
  )
}
