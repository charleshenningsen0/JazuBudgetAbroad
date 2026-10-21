import type { AirfareOption, CustomCost, TripInputs, TripLeg } from './calc'
import { DEFAULT_INPUTS } from './calc'
import { ALL_CATEGORY_KEYS } from '../data/categories'
import type { CategoryKey } from '../data/categories'
import type { TierId } from '../data/tiers'

const VALID_TIERS: TierId[] = ['frugal', 'standard', 'comfort', 'premium']
const VALID_AIRFARE: AirfareOption[] = ['none', 'oneway', 'roundtrip']
const VALID_CATEGORIES = new Set<string>(ALL_CATEGORY_KEYS)

/** Characters used as separators in the custom-cost payload. */
const CUSTOM_SEP = '~'
const CUSTOM_LIST_SEP = ';'

/**
 * Encodes the calculator state into the query string so a link can be shared.
 *
 *   ?l=paris:10,rome:4      legs (destination:days, in travel order)
 *   ?t=comfort               spending tier
 *   ?p=2                     travellers
 *   ?a=roundtrip             airfare
 *   ?c=food,transit          which categories to calculate
 *   ?x=c1~Souvenirs~200~total~1   custom costs
 *
 * Legacy single-destination links (?d=paris&n=30) are still understood.
 */
export function encodeState(inputs: TripInputs): string {
  const params = new URLSearchParams()

  const legs = inputs.legs
    .map((l) => `${l.destinationId}:${Math.max(1, Math.round(l.days))}`)
    .join(',')
  if (legs) params.set('l', legs)

  if (inputs.tier !== DEFAULT_INPUTS.tier) params.set('t', inputs.tier)
  if (inputs.travelers !== DEFAULT_INPUTS.travelers) {
    params.set('p', String(Math.round(inputs.travelers)))
  }
  if (inputs.airfare !== DEFAULT_INPUTS.airfare) params.set('a', inputs.airfare)

  const sorted = [...inputs.categories].sort()
  const allSorted = [...ALL_CATEGORY_KEYS].sort()
  if (sorted.join(',') !== allSorted.join(',')) {
    params.set('c', sorted.join(','))
  }

  const custom = inputs.customCosts
    .filter((c) => c.label.trim().length > 0)
    .map((c) =>
      [
        c.id,
        sanitize(c.label),
        Math.max(0, Math.round(c.amount)),
        c.mode,
        c.enabled ? '1' : '0',
      ].join(CUSTOM_SEP),
    )
    .join(CUSTOM_LIST_SEP)
  if (custom) params.set('x', custom)

  if (!inputs.includeVisa) params.set('v', '0')
  if (!inputs.includeInsurance) params.set('i', '0')
  if (!inputs.includeSetup) params.set('s', '0')

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function sanitize(value: string): string {
  return value.replace(/[~;]/g, '-').trim()
}

function toInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function decodeLegs(params: URLSearchParams): TripLeg[] {
  const raw = params.get('l')
  if (raw) {
    const legs = raw
      .split(',')
      .map((chunk, index) => {
        const [destinationId, days] = chunk.split(':')
        if (!destinationId) return null
        return {
          id: `leg-${index + 1}`,
          destinationId,
          days: toInt(days ?? null, 1, 1, 1095),
        }
      })
      .filter((l): l is TripLeg => l !== null)
    if (legs.length > 0) return legs
  }

  // Legacy: a single destination and a number of days.
  const legacyId = params.get('d')
  if (legacyId) {
    return [
      {
        id: 'leg-1',
        destinationId: legacyId,
        days: toInt(params.get('n'), DEFAULT_INPUTS.legs[0].days, 1, 1095),
      },
    ]
  }

  return DEFAULT_INPUTS.legs
}

function decodeCustom(params: URLSearchParams): CustomCost[] {
  const raw = params.get('x')
  if (!raw) return []
  return raw
    .split(CUSTOM_LIST_SEP)
    .map((chunk) => {
      const parts = chunk.split(CUSTOM_SEP)
      if (parts.length < 3) return null
      const [id, label, amount, mode, enabled] = parts
      if (!id || !label) return null
      return {
        id,
        label,
        amount: toInt(amount, 0, 0, 1_000_000),
        mode: mode === 'daily' ? 'daily' : 'total',
        enabled: enabled !== '0',
      }
    })
    .filter((c): c is CustomCost => c !== null)
}

/** Reads calculator state back out of a query string. */
export function decodeState(search: string): TripInputs {
  const params = new URLSearchParams(search)
  const tierParam = params.get('t') as TierId | null
  const airfareParam = params.get('a') as AirfareOption | null

  const catParam = params.get('c')
  const categories = catParam === null
    ? [...ALL_CATEGORY_KEYS]
    : (catParam.split(',').filter((k) => VALID_CATEGORIES.has(k)) as CategoryKey[])

  return {
    legs: decodeLegs(params),
    travelers: toInt(params.get('p'), DEFAULT_INPUTS.travelers, 1, 50),
    tier: tierParam && VALID_TIERS.includes(tierParam) ? tierParam : DEFAULT_INPUTS.tier,
    airfare:
      airfareParam && VALID_AIRFARE.includes(airfareParam)
        ? airfareParam
        : DEFAULT_INPUTS.airfare,
    categories,
    customCosts: decodeCustom(params),
    includeVisa: params.get('v') !== '0',
    includeInsurance: params.get('i') !== '0',
    includeSetup: params.get('s') !== '0',
  }
}

/** The absolute shareable URL for the current calculator state. */
export function shareUrl(inputs: TripInputs): string {
  const { origin, pathname } = window.location
  return `${origin}${pathname}${encodeState(inputs)}`
}
