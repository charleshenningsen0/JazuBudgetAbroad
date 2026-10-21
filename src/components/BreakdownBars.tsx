import type { ReactNode } from 'react'
import type { CategoryLine } from '../lib/calc'
import { formatUSD } from '../lib/format'
import { IconBed, IconBus, IconFood, IconBag, IconTicket } from './Icons'

const ICONS: Record<string, ReactNode> = {
  accommodation: <IconBed />,
  food: <IconFood />,
  transit: <IconBus />,
  activities: <IconTicket />,
  extras: <IconBag />,
}

interface Props {
  categories: CategoryLine[]
  /** Total living cost for the trip, used for the daily summary line. */
  livingTotal: number
  days: number
}

export function BreakdownBars({ categories, livingTotal, days }: Props) {
  return (
    <ul className="breakdown">
      {categories.map((c) => (
        <li key={c.key} className="breakdown-row">
          <span className={`breakdown-icon breakdown-icon--${c.key}`}>{ICONS[c.key]}</span>
          <span className="breakdown-body">
            <span className="breakdown-top">
              <span className="breakdown-label">{c.label}</span>
              <span className="breakdown-amount">{formatUSD(c.amount)}</span>
            </span>
            <span className="breakdown-bar">
              <span
                className={`breakdown-fill breakdown-fill--${c.key}`}
                style={{ width: `${Math.max(2, c.share * 100)}%` }}
              />
            </span>
            <span className="breakdown-sub">
              {formatUSD(c.daily)} / day &middot; {Math.round(c.share * 100)}% of living costs
            </span>
          </span>
        </li>
      ))}
      <li className="breakdown-total">
        <span className="breakdown-label">Average living cost</span>
        <span className="breakdown-amount">{formatUSD(livingTotal / days)} / day</span>
      </li>
    </ul>
  )
}
