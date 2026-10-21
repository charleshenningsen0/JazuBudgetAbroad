import { ALL_CATEGORY_KEYS, CATEGORIES } from '../data/categories'
import type { CategoryKey } from '../data/categories'
import type { Destination } from '../data/destinations'
import { findDestination } from '../data/destinations'
import type { Tier, TierId } from '../data/tiers'
import { findTier, INSURANCE_PER_MONTH } from '../data/tiers'
import { formatUSD } from './format'

export type AirfareOption = 'none' | 'oneway' | 'roundtrip'

/** One stop on the trip: a destination and how long you stay there. */
export interface TripLeg {
  id: string
  destinationId: string
  days: number
}

/** A cost the student adds themselves (souvenirs, hostel upgrade, gear…). */
export interface CustomCost {
  id: string
  label: string
  amount: number
  /** 'total' is a one-off amount, 'daily' is per day of the whole trip. */
  mode: 'total' | 'daily'
  enabled: boolean
}

export interface TripInputs {
  legs: TripLeg[]
  travelers: number
  tier: TierId
  airfare: AirfareOption
  /** Which built-in categories to include in the calculation. */
  categories: CategoryKey[]
  customCosts: CustomCost[]
  includeVisa: boolean
  includeInsurance: boolean
  includeSetup: boolean
}

export const DEFAULT_INPUTS: TripInputs = {
  legs: [{ id: 'leg-1', destinationId: 'barcelona', days: 30 }],
  travelers: 1,
  tier: 'standard',
  airfare: 'roundtrip',
  categories: [...ALL_CATEGORY_KEYS],
  customCosts: [],
  includeVisa: true,
  includeInsurance: true,
  includeSetup: true,
}

export interface CategoryLine {
  key: string
  label: string
  /** Total for the whole trip in USD. */
  amount: number
  /** Daily equivalent across the whole trip, in USD. */
  daily: number
  /** Share of the living subtotal (0–1). */
  share: number
  kind: 'built-in' | 'custom'
  icon: string
}

export interface OneOffLine {
  key: string
  label: string
  amount: number
}

export interface LegLine {
  legId: string
  destination: Destination
  days: number
  /** Living cost attributable to this leg, in USD. */
  amount: number
  /** The same amount in the destination's local currency. */
  localAmount: number
  share: number
}

export interface TripEstimate {
  tier: Tier
  inputs: TripInputs
  totalDays: number
  categories: CategoryLine[]
  legs: LegLine[]
  oneOffs: OneOffLine[]
  /** Sum of the recurring categories. */
  livingTotal: number
  /** Sum of the one-off costs. */
  oneOffTotal: number
  /** Emergency buffer. */
  contingency: number
  /** livingTotal + oneOffTotal + contingency — the headline number. */
  grandTotal: number
  perTraveler: number
  perDay: number
  perWeek: number
  perMonth: number
  /** Local currency equivalent, only meaningful for a single-destination trip. */
  local: { currency: string; symbol: string; amount: number } | null
  /** Which built-in categories were left out of the calculation. */
  excludedCategories: CategoryKey[]
}

/** Airfare is priced per region: one return ticket per region you visit. */
export function airfareEstimate(legs: TripLeg[], mode: AirfareOption): number {
  if (mode === 'none') return 0
  const byRegion = new Map<string, number>()
  for (const leg of legs) {
    const dest = findDestination(leg.destinationId)
    byRegion.set(dest.region, Math.max(byRegion.get(dest.region) ?? 0, dest.flight))
  }
  const total = [...byRegion.values()].reduce((sum, v) => sum + v, 0)
  return mode === 'roundtrip' ? total : total / 2
}

/** One visa per visa group, so a multi-country Schengen trip pays once. */
export function visaEstimate(legs: TripLeg[]): { amount: number; groups: string[] } {
  const groups = new Map<string, number>()
  for (const leg of legs) {
    const dest = findDestination(leg.destinationId)
    const group = dest.visaGroup ?? dest.country
    groups.set(group, Math.max(groups.get(group) ?? 0, dest.visa))
  }
  const payable = [...groups.entries()].filter(([, fee]) => fee > 0)
  return {
    amount: payable.reduce((sum, [, fee]) => sum + fee, 0),
    groups: payable.map(([name]) => name),
  }
}

/**
 * Produces the full budget estimate for a trip.
 * All monetary values are in USD unless stated otherwise.
 */
export function estimateTrip(inputs: TripInputs): TripEstimate {
  const tier = findTier(inputs.tier)
  const travelers = Math.max(1, Math.round(inputs.travelers))
  const enabled = new Set<CategoryKey>(inputs.categories)

  const sourceLegs = inputs.legs.length > 0 ? inputs.legs : DEFAULT_INPUTS.legs
  const legs = sourceLegs.map((leg) => ({
    ...leg,
    days: Math.max(1, Math.round(leg.days || 1)),
  }))
  const totalDays = legs.reduce((sum, leg) => sum + leg.days, 0)

  const dailyCustom = inputs.customCosts.filter((c) => c.enabled && c.mode === 'daily')

  // --- per-leg living cost ------------------------------------------------
  const legAmounts = legs.map((leg) => {
    const dest = findDestination(leg.destinationId)
    const nights = Math.max(1, leg.days - 1)
    let amount = 0
    for (const cat of CATEGORIES) {
      if (!enabled.has(cat.key)) continue
      const perDay = dest[cat.field] * tier.mult[cat.field]
      amount += perDay * (cat.basis === 'night' ? nights : leg.days)
    }
    for (const custom of dailyCustom) amount += custom.amount * leg.days
    return amount
  })

  const legLines: LegLine[] = legs.map((leg, i) => {
    const dest = findDestination(leg.destinationId)
    return {
      legId: leg.id,
      destination: dest,
      days: leg.days,
      amount: legAmounts[i],
      localAmount: legAmounts[i] * dest.perUSD,
      share: 0,
    }
  })

  // --- category totals ----------------------------------------------------
  const categoryAmounts = new Map<CategoryKey, number>()
  for (const cat of CATEGORIES) {
    if (!enabled.has(cat.key)) continue
    let amount = 0
    for (const leg of legs) {
      const dest = findDestination(leg.destinationId)
      const nights = Math.max(1, leg.days - 1)
      const perDay = dest[cat.field] * tier.mult[cat.field]
      amount += perDay * (cat.basis === 'night' ? nights : leg.days)
    }
    categoryAmounts.set(cat.key, amount)
  }

  const categories: CategoryLine[] = [
    ...CATEGORIES.filter((c) => enabled.has(c.key)).map((c) => ({
      key: c.key,
      label: c.label,
      amount: categoryAmounts.get(c.key) ?? 0,
      daily: (categoryAmounts.get(c.key) ?? 0) / totalDays,
      share: 0,
      kind: 'built-in' as const,
      icon: c.icon,
    })),
    ...dailyCustom.map((c) => ({
      key: c.id,
      label: c.label,
      amount: c.amount * totalDays,
      daily: c.amount,
      share: 0,
      kind: 'custom' as const,
      icon: 'tag',
    })),
  ]

  const livingTotal = categories.reduce((sum, c) => sum + c.amount, 0)
  for (const c of categories) {
    c.share = livingTotal > 0 ? c.amount / livingTotal : 0
  }

  // --- one-off costs ------------------------------------------------------
  const oneOffs: OneOffLine[] = []
  const airfare = airfareEstimate(legs, inputs.airfare)
  if (airfare > 0) {
    oneOffs.push({
      key: 'airfare',
      label: inputs.airfare === 'roundtrip' ? 'Return airfare' : 'One-way airfare',
      amount: airfare,
    })
  }
  if (inputs.includeVisa) {
    const visa = visaEstimate(legs)
    if (visa.amount > 0) {
      oneOffs.push({
        key: 'visa',
        label: `Visa & entry fees${visa.groups.length ? ` (${visa.groups.join(', ')})` : ''}`,
        amount: visa.amount,
      })
    }
  }
  if (inputs.includeInsurance) {
    oneOffs.push({
      key: 'insurance',
      label: 'Travel insurance',
      amount: Math.max(9, (INSURANCE_PER_MONTH * totalDays) / 30.44),
    })
  }
  if (inputs.includeSetup) {
    oneOffs.push({ key: 'setup', label: 'Setup & gear (SIM, supplies)', amount: tier.setup })
  }
  for (const custom of inputs.customCosts.filter((c) => c.enabled && c.mode === 'total')) {
    oneOffs.push({ key: custom.id, label: custom.label, amount: custom.amount })
  }

  const oneOffTotal = oneOffs.reduce((sum, o) => sum + o.amount, 0)
  const contingency = (livingTotal + oneOffTotal) * tier.contingency
  const grandTotal = livingTotal + oneOffTotal + contingency

  for (const leg of legLines) {
    leg.share = livingTotal > 0 ? leg.amount / livingTotal : 0
  }

  const excludedCategories = ALL_CATEGORY_KEYS.filter((k) => !enabled.has(k))

  const singleLeg = legs.length === 1 ? legLines[0] : null

  return {
    tier,
    inputs: { ...inputs, travelers },
    totalDays,
    categories,
    legs: legLines,
    oneOffs,
    livingTotal,
    oneOffTotal,
    contingency,
    grandTotal,
    perTraveler: grandTotal / travelers,
    perDay: grandTotal / totalDays,
    perWeek: grandTotal / (totalDays / 7),
    perMonth: grandTotal / (totalDays / 30.44),
    local: singleLeg
      ? {
          currency: singleLeg.destination.currency,
          symbol: singleLeg.destination.symbol,
          amount: singleLeg.localAmount,
        }
      : null,
    excludedCategories,
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
  const perDayGap = difference / estimate.totalDays

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
