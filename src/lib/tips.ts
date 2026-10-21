import type { Destination } from '../data/destinations'
import type { Tier } from '../data/tiers'

export interface Tip {
  title: string
  detail: string
  tone: 'save' | 'info'
}

/**
 * Builds practical, destination-aware saving tips for the current selection.
 */
export function buildTips(
  destinations: Destination[],
  tier: Tier,
  days: number,
  perDay: number,
  travelers: number,
): Tip[] {
  const tips: Tip[] = []
  const seen = new Set<string>()

  // One location tip per destination, skipping repeats of the same city.
  for (const dest of destinations) {
    if (seen.has(dest.city)) continue
    seen.add(dest.city)
    tips.push({
      title: `Save money in ${dest.city}`,
      detail: dest.tip,
      tone: 'save',
    })
  }

  const isMultiDestination = destinations.length > 1
  const uniqueRegions = new Set(destinations.map((d) => d.region)).size

  if (isMultiDestination) {
    const repacks = destinations.length - 1
    tips.push({
      title: 'Pack for the whole trip, not each stop',
      detail: `Travelling through ${destinations.length} destinations means repacking ${repacks === 1 ? 'once' : `${repacks} times`}. Bring a full-size suitcase and wash clothes at a hostel laundry rather than packing for every climate separately.`,
      tone: 'save',
    })
  }

  if (uniqueRegions > 1) {
    tips.push({
      title: 'Price each region separately',
      detail:
        'Your airfare is estimated one return ticket per region, so a trip spanning two regions costs more to fly than a single-country one. Compare open-jaw and multi-city fares before booking.',
      tone: 'info',
    })
  }

  const longStay = days >= 60
  if (longStay) {
    tips.push({
      title: `At ${days} days, aim for a monthly rental`,
      detail:
        'Furnished monthly rentals usually cost 15–25% less than nightly rates once you stay past a few weeks. Ask your university housing office first.',
      tone: 'save',
    })
  }

  if (tier.id === 'frugal') {
    const foodSaving = Math.round(
      destinations.reduce((sum, d) => sum + d.food * tier.mult.food, 0) * days * 0.35,
    )
    tips.push({
      title: 'Cook one meal a day',
      detail: `Cooking roughly one meal a day saves around $${foodSaving} across this trip.`,
      tone: 'save',
    })
  }

  if (tier.id === 'premium' || tier.id === 'comfort') {
    tips.push({
      title: 'Split a private room instead of a hotel',
      detail:
        'Two students sharing a room usually pay less than one person in a hotel, and it gives you a kitchen to cut food costs.',
      tone: 'save',
    })
  }

  if (travelers > 1) {
    tips.push({
      title: 'Agree on a shared daily cap',
      detail: `With ${travelers} people, a shared budget for meals and nights out stops the total drifting upward. Split the difference in cash at the end of each week.`,
      tone: 'save',
    })
  }

  if (days >= 14) {
    tips.push({
      title: 'Get a transit pass, not single tickets',
      detail:
        'Over two weeks, daily or weekly passes almost always beat buying tickets one at a time. Check if your student ID includes transit.',
      tone: 'save',
    })
  }

  const primary = destinations[0]
  if (primary) {
    const rate = primary.perUSD
    const rateText = rate < 10 ? rate.toFixed(2) : Math.round(rate).toLocaleString('en-US')
    const direction = rate < 1 ? 'costs' : 'spends'
    tips.push({
      title: 'Watch the exchange rate',
      detail: `Cash is usually better than card abroad, but exchange at a mid-market rate. One US dollar ${direction} roughly ${rateText} ${primary.currency} — check the rate the week you travel.`,
      tone: 'info',
    })
  }

  if (perDay > 150) {
    tips.push({
      title: 'Your daily rate is high for a student budget',
      detail:
        'At this pace a single month can pass quickly. Look for a weekly grocery plan and free cultural events to pull the average down.',
      tone: 'info',
    })
  }

  return tips
}
