import type { AirfareOption, TripInputs } from './calc'
import { DEFAULT_INPUTS } from './calc'
import type { TierId } from '../data/tiers'

const VALID_TIERS: TierId[] = ['frugal', 'standard', 'comfort', 'premium']
const VALID_AIRFARE: AirfareOption[] = ['none', 'oneway', 'roundtrip']

/**
 * Encodes the calculator state into the query string so a link can be shared.
 * Short keys keep the URL readable: ?d=paris&n=30&t=standard
 */
export function encodeState(inputs: TripInputs): string {
  const params = new URLSearchParams()
  if (inputs.destinationId !== DEFAULT_INPUTS.destinationId) {
    params.set('d', inputs.destinationId)
  }
  if (inputs.days !== DEFAULT_INPUTS.days) params.set('n', String(inputs.days))
  if (inputs.travelers !== DEFAULT_INPUTS.travelers) params.set('p', String(inputs.travelers))
  if (inputs.tier !== DEFAULT_INPUTS.tier) params.set('t', inputs.tier)
  if (inputs.airfare !== DEFAULT_INPUTS.airfare) params.set('a', inputs.airfare)
  if (!inputs.includeVisa) params.set('v', '0')
  if (!inputs.includeInsurance) params.set('i', '0')
  if (!inputs.includeSetup) params.set('s', '0')
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

function toInt(value: string | null, fallback: number, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

/** Reads calculator state back out of a query string. */
export function decodeState(search: string): TripInputs {
  const params = new URLSearchParams(search)
  const tierParam = params.get('t') as TierId | null
  const airfareParam = params.get('a') as AirfareOption | null

  return {
    destinationId: params.get('d') ?? DEFAULT_INPUTS.destinationId,
    days: toInt(params.get('n'), DEFAULT_INPUTS.days, 1, 1095),
    travelers: toInt(params.get('p'), DEFAULT_INPUTS.travelers, 1, 50),
    tier: tierParam && VALID_TIERS.includes(tierParam) ? tierParam : DEFAULT_INPUTS.tier,
    airfare: airfareParam && VALID_AIRFARE.includes(airfareParam) ? airfareParam : DEFAULT_INPUTS.airfare,
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
