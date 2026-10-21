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
  destination: Destination,
  tier: Tier,
  days: number,
  perDay: number,
): Tip[] {
  const tips: Tip[] = [
    {
      title: destination.tip,
      detail: `Insider tip for ${destination.city} — the kind of thing that quietly saves hundreds over a semester.`,
      tone: 'save',
    },
  ]

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
    tips.push({
      title: 'Cook one meal a day',
      detail: `Cooking roughly one meal a day saves around $${Math.round(destination.food * tier.mult.food * days * 0.35)} across this trip in ${destination.city}.`,
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

  if (days >= 14) {
    tips.push({
      title: 'Get a transit pass, not single tickets',
      detail:
        'Over two weeks, daily or weekly passes almost always beat buying tickets one at a time. Check if your student ID includes transit.',
      tone: 'save',
    })
  }

  tips.push({
    title: 'Watch the exchange rate',
    detail: `Cash is usually better than card abroad, but exchange at a mid-market rate. ${destination.currency} spends roughly ${Math.round(destination.perUSD)} to the dollar — check the rate the week you travel.`,
    tone: 'info',
  })

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
