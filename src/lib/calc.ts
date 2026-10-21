import type { Destination } from '../data/destinations'
import { findDestination } from '../data/destinations'
import type { Tier, TierId } from '../data/tiers'
import { findTier, INSURANCE_PER_MONTH } from '../data/tiers'
import { formatUSD } from './format'

export type AirfareOption = 'none' | 'oneway' | 'roundtrip'

export interface TripInputs {
  destinationId: string
  days: number
  travelers: number
  tier: TierId
  airfare: AirfareOption
  includeVisa: boolean
  includeInsurance: boolean
  includeSetup: boolean
}

export const DEFAULT_INPUTS: TripInputs = {
  destinationId: 'barcelona',
  days: 30,
  travelers: 1,
  tier: 'standard',
  airfare: 'roundtrip',
  includeVisa: true,
  includeInsurance: true,
  includeSetup: true,
}

export interface CategoryLine {
  key: string
  label: string
  /** Total for the whole trip in USD. */
  amount: number
  /** Daily equivalent in USD. */
  daily: number
  /** Share of the living subtotal (0–1). */
  share: number
}

export interface OneOffLine {
  key: string
  label: string
  amount: number
}

export interface TripEstimate {
  destination: Destination
  tier: Tier
  inputs: TripInputs
  /** Recurring daily categories (accommodation … extras). */
  categories: CategoryLine[]
  /** One-off costs (flights, visa, insurance, setup). */
  oneOffs: OneOffLine[]
  /** Sum of the recurring categories. */
  livingTotal: number
  /** Sum of the one-off costs. */
  oneOffTotal: number
  /** Emergency buffer. */
  contingency: number
  /** livingTotal + oneOffTotal + contingency — the headline number. */
  grandTotal: number
  /** grandTotal / travelers. */
  perTraveler: number
  /** grandTotal / days. */
  perDay: number
  /** grandTotal / (days / 7). */
  perWeek: number
  /** grandTotal / (days / 30.44). */
  perMonth: number
  /** Same total expressed in the destination's local currency. */
  local: { currency: string; symbol: string; amount: number }
}

/**
 * Produces the full budget estimate for a trip.
 * All monetary values are in USD unless stated otherwise.
 */
export function estimateTrip(inputs: TripInputs): TripEstimate {
  const destination = findDestination(inputs.destinationId)
  const tier = findTier(inputs.tier)

  const days = Math.max(1, Math.round(inputs.days))
  const nights = Math.max(1, days - 1) // the last night is usually the night before flying home
  const travelers = Math.max(1, Math.round(inputs.travelers))

  const raw: Array<Omit<CategoryLine, 'amount' | 'daily' | 'share'> & { perDay: number }> = [
    {
      key: 'accommodation',
      label: 'Accommodation',
      perDay: destination.lodging * tier.mult.lodging,
    },
    {
      key: 'food',
      label: 'Food & groceries',
      perDay: destination.food * tier.mult.food,
    },
    {
      key: 'transit',
      label: 'Local transport',
      perDay: destination.transit * tier.mult.transit,
    },
    {
      key: 'activities',
      label: 'Activities & nightlife',
      perDay: destination.activities * tier.mult.activities,
    },
    {
      key: 'extras',
      label: 'Shopping & sundries',
      perDay: destination.extras * tier.mult.extras,
    },
  ]

  // Accommodation is charged per night, the rest per day.
  const dailyTotals = raw.map((r) =>
    r.key === 'accommodation' ? r.perDay * nights : r.perDay * days,
  )

  const livingTotal = dailyTotals.reduce((sum, v) => sum + v, 0)

  const categories: CategoryLine[] = raw.map((r, i) => ({
    key: r.key,
    label: r.label,
    amount: dailyTotals[i],
    daily: r.perDay,
    share: livingTotal > 0 ? dailyTotals[i] / livingTotal : 0,
  }))

  const oneOffs: OneOffLine[] = []
  if (inputs.airfare === 'roundtrip') {
    oneOffs.push({ key: 'airfare', label: 'Round-trip airfare', amount: destination.flight })
  } else if (inputs.airfare === 'oneway') {
    oneOffs.push({ key: 'airfare', label: 'One-way airfare', amount: destination.flight / 2 })
  }
  if (inputs.includeVisa && destination.visa > 0) {
    oneOffs.push({ key: 'visa', label: `Visa & entry fees (${destination.country})`, amount: destination.visa })
  }
  if (inputs.includeInsurance) {
    oneOffs.push({
      key: 'insurance',
      label: 'Travel insurance',
      amount: Math.max(9, (INSURANCE_PER_MONTH * days) / 30.44),
    })
  }
  if (inputs.includeSetup) {
    oneOffs.push({ key: 'setup', label: 'Setup & gear (SIM, supplies)', amount: tier.setup })
  }

  const oneOffTotal = oneOffs.reduce((sum, v) => sum + v.amount, 0)
  const contingency = (livingTotal + oneOffTotal) * tier.contingency
  const grandTotal = livingTotal + oneOffTotal + contingency

  return {
    destination,
    tier,
    inputs: { ...inputs, days, travelers },
    categories,
    oneOffs,
    livingTotal,
    oneOffTotal,
    contingency,
    grandTotal,
    perTraveler: grandTotal / travelers,
    perDay: grandTotal / days,
    perWeek: grandTotal / (days / 7),
    perMonth: grandTotal / (days / 30.44),
    local: {
      currency: destination.currency,
      symbol: destination.symbol,
      amount: grandTotal * destination.perUSD,
    },
  }
}

/**
 * Compares the estimate against a budget the student has available.
 */
export interface BudgetCheck {
  budget: number
  difference: number
  status: 'under' | 'tight' | 'over'
  perDayGap: number
  message: string
}

export function checkBudget(estimate: TripEstimate, budget: number | null): BudgetCheck | null {
  if (budget === null || !Number.isFinite(budget) || budget <= 0) return null
  const difference = budget - estimate.grandTotal
  const ratio = estimate.grandTotal / budget
  const perDayGap = difference / estimate.inputs.days

  let status: BudgetCheck['status']
  let message: string
  if (ratio <= 0.9) {
    status = 'under'
    message = `You have ${formatUSD(Math.abs(difference))} of breathing room. That is a comfortable margin.`
  } else if (ratio <= 1.05) {
    status = 'tight'
    message = `Your budget covers the trip with only ${formatUSD(Math.abs(difference))} to spare — one missed flight could break it.`
  } else {
    status = 'over'
    message = `You are short by ${formatUSD(Math.abs(difference))}. Trim the tier, length, or travel party to close the gap.`
  }

  return { budget, difference, status, perDayGap, message }
}
