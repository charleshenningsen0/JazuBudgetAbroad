import type { ReactNode } from 'react'
import type { CategoryLine } from '../lib/calc'
import { formatUSD } from '../lib/format'
import { IconBag, IconBed, IconBus, IconFood, IconTag, IconTicket } from './Icons'

const ICONS: Record<string, ReactNode> = {
  bed: <IconBed />,
  food: <IconFood />,
  bus: <IconBus />,
  ticket: <IconTicket />,
  bag: <IconBag />,
  tag: <IconTag />,
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
          <span className={`breakdown-icon breakdown-icon--${c.key}`}>{ICONS[c.icon]}</span>
          <span className="breakdown-body">
            <span className="breakdown-top">
              <span className="breakdown-label">
                {c.label}
                {c.kind === 'custom' && <span className="badge">yours</span>}
              </span>
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
