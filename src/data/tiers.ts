export type TierId = 'frugal' | 'standard' | 'comfort' | 'premium'

export interface Tier {
  id: TierId
  name: string
  tagline: string
  /** Emoji-free accent colour used by the UI. */
  accent: string
  /** Multipliers applied to the destination's "typical student" daily costs. */
  mult: {
    lodging: number
    food: number
    transit: number
    activities: number
    extras: number
  }
  /** One-off setup cost (SIM, gear, vaccinations, first-week supplies) in USD. */
  setup: number
  /** Emergency buffer as a fraction of living costs. */
  contingency: number
}

export const TIERS: Tier[] = [
  {
    id: 'frugal',
    name: 'Frugal',
    tagline: 'Hostels, cook most meals, free sights',
    accent: '#10b981',
    // Food has the widest cut at the frugal end (cook instead of eating out),
    // but lodging still has the widest overall spread across tiers.
    mult: { lodging: 0.75, food: 0.65, transit: 0.8, activities: 0.6, extras: 0.5 },
    setup: 120,
    contingency: 0.12,
  },
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'The typical student budget',
    accent: '#3b82f6',
    mult: { lodging: 1, food: 1, transit: 1, activities: 1, extras: 1 },
    setup: 180,
    contingency: 0.1,
  },
  {
    id: 'comfort',
    name: 'Comfort',
    tagline: 'Private room, eat out most days',
    accent: '#f59e0b',
    mult: { lodging: 1.5, food: 1.35, transit: 1.35, activities: 1.6, extras: 1.7 },
    setup: 260,
    contingency: 0.08,
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Hotels, convenience, no compromises',
    accent: '#a855f7',
    mult: { lodging: 2.6, food: 1.9, transit: 1.9, activities: 2.6, extras: 2.6 },
    setup: 400,
    contingency: 0.07,
  },
]

export const TIER_BY_ID = new Map(TIERS.map((t) => [t.id, t]))

export function findTier(id: TierId): Tier {
  return TIER_BY_ID.get(id) ?? TIERS[1]
}

/** Student travel insurance: about $30 per month, prorated for partial months. */
export const INSURANCE_PER_MONTH = 30
