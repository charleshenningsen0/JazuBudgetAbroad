/**
 * Sanity checks for the budget engine.
 * Run with: npm run verify
 */
import { DESTINATIONS, findDestination } from '../src/data/destinations'
import { ALL_CATEGORY_KEYS, CATEGORIES } from '../src/data/categories'
import { TIERS } from '../src/data/tiers'
import {
  DEFAULT_INPUTS,
  airfareEstimate,
  checkBudget,
  estimateTrip,
  visaEstimate,
} from '../src/lib/calc'
import type { CustomCost, TripInputs, TripLeg } from '../src/lib/calc'
import { decodeState, encodeState } from '../src/lib/urlState'
import { describeDuration, formatLocal, formatUSD } from '../src/lib/format'

let failures = 0
let checks = 0

function ok(condition: boolean, message: string) {
  checks++
  if (!condition) {
    failures++
    console.error(`  ✗ ${message}`)
  }
}

function section(name: string) {
  console.log(`\n${name}`)
}

function legs(...pairs: Array<[string, number]>): TripLeg[] {
  return pairs.map(([destinationId, days], i) => ({
    id: `leg-${i + 1}`,
    destinationId,
    days,
  }))
}

// ---------------------------------------------------------------- data sanity
section('Destination data')
ok(DESTINATIONS.length >= 40, `expected 40+ destinations, got ${DESTINATIONS.length}`)
ok(
  new Set(DESTINATIONS.map((d) => d.id)).size === DESTINATIONS.length,
  'destination ids must be unique',
)
for (const d of DESTINATIONS) {
  ok(d.lodging > 0 && d.food > 0 && d.transit >= 0, `${d.city}: daily costs must be positive`)
  ok(d.perUSD > 0, `${d.city}: exchange rate must be positive`)
  ok(d.currency.length === 3, `${d.city}: currency must be an ISO code`)
}
ok(
  CATEGORIES.filter((c) => c.basis === 'night').length === 1,
  'exactly one category (accommodation) is charged per night',
)

// --------------------------------------------------------------------- tiers
section('Tier multipliers')
for (const tier of TIERS) {
  ok(
    tier.mult.food <= tier.mult.lodging,
    `${tier.name}: food should never scale harder than accommodation`,
  )
  ok(tier.contingency > 0 && tier.contingency < 0.2, `${tier.name}: contingency rate is implausible`)
}
const tierSpread = (field: 'lodging' | 'food') =>
  TIERS[TIERS.length - 1].mult[field] / TIERS[0].mult[field]
ok(
  tierSpread('lodging') > tierSpread('food'),
  'accommodation should have the widest spread between the cheapest and priciest tier',
)
const cheap = estimateTrip({ ...DEFAULT_INPUTS, tier: 'frugal' })
const pricey = estimateTrip({ ...DEFAULT_INPUTS, tier: 'premium' })
ok(pricey.grandTotal > cheap.grandTotal, 'premium tier must cost more than frugal')

// ------------------------------------------------------------------ estimates
section('Trip estimates')
const base = estimateTrip(DEFAULT_INPUTS)
ok(base.grandTotal > 0, 'total must be positive')
ok(
  Math.abs(base.categories.reduce((s, c) => s + c.amount, 0) - base.livingTotal) < 0.01,
  'categories must sum to the living total',
)
ok(
  Math.abs(base.categories.reduce((s, c) => s + c.share, 0) - 1) < 0.0001,
  'category shares must sum to 1',
)
ok(base.oneOffTotal > 0, 'one-off costs should be included by default')
ok(base.contingency > 0, 'contingency must be positive')
ok(
  Math.abs(base.perTraveler - base.grandTotal / DEFAULT_INPUTS.travelers) < 0.01,
  'per-traveler must divide the total',
)
ok(
  Math.abs(base.perDay - base.grandTotal / base.totalDays) < 0.01,
  'per-day must divide the total',
)
ok(base.local !== null, 'a single-destination trip exposes a local currency figure')
ok(base.totalDays === DEFAULT_INPUTS.legs[0].days, 'total days comes from the legs')

const doubleStay = estimateTrip({ ...DEFAULT_INPUTS, legs: legs(['barcelona', 60]) })
ok(
  doubleStay.livingTotal > base.livingTotal * 1.9,
  'doubling the stay should roughly double living costs',
)
const group = estimateTrip({ ...DEFAULT_INPUTS, travelers: 4 })
ok(
  Math.abs(group.perTraveler - base.grandTotal / 4) < 0.01,
  'splitting the group divides the per-person cost',
)
const noFlights = estimateTrip({ ...DEFAULT_INPUTS, airfare: 'none' })
ok(noFlights.grandTotal < base.grandTotal, 'removing flights must reduce the total')
const oneWay = estimateTrip({ ...DEFAULT_INPUTS, airfare: 'oneway' })
ok(
  oneWay.grandTotal > noFlights.grandTotal && oneWay.grandTotal < base.grandTotal,
  'one-way fares must sit between no airfare and round-trip',
)

// --------------------------------------------------------- multiple destinations
section('Multiple destinations')
const multi = estimateTrip({
  ...DEFAULT_INPUTS,
  legs: legs(['paris', 10], ['rome', 4]),
})
ok(multi.legs.length === 2, 'the trip has two stops')
ok(multi.totalDays === 14, 'total days is the sum of the stops')
ok(multi.local === null, 'a multi-destination trip has no single local currency figure')

const parisOnly = estimateTrip({ ...DEFAULT_INPUTS, legs: legs(['paris', 10]) })
const romeOnly = estimateTrip({ ...DEFAULT_INPUTS, legs: legs(['rome', 4]) })
ok(
  multi.livingTotal > parisOnly.livingTotal && multi.livingTotal > romeOnly.livingTotal,
  'a two-stop trip costs more than either stop alone',
)
ok(
  Math.abs(multi.livingTotal - (parisOnly.livingTotal + romeOnly.livingTotal)) < 0.5,
  'living costs across two stops equal the sum of each stop',
)
ok(
  Math.abs(multi.legs[0].amount + multi.legs[1].amount - multi.livingTotal) < 0.01,
  'per-stop amounts sum to the living total',
)
ok(
  Math.abs(multi.legs[0].share + multi.legs[1].share - 1) < 0.0001,
  'per-stop shares sum to 1',
)
ok(
  multi.legs[0].localAmount > 0 && multi.legs[1].localAmount > 0,
  'each stop reports its own local currency amount',
)
ok(
  multi.legs[0].localAmount !== multi.legs[1].localAmount,
  'stops in different currencies report different local amounts',
)
ok(
  multi.legs[0].destination.currency === multi.legs[1].destination.currency,
  'Paris and Rome share the euro, so their local amounts use one rate',
)

const mixedCurrency = estimateTrip({
  ...DEFAULT_INPUTS,
  legs: legs(['paris', 10], ['tokyo', 4]),
})
ok(
  mixedCurrency.legs[0].destination.currency !== mixedCurrency.legs[1].destination.currency,
  'Paris and Tokyo use different currencies',
)
ok(
  Math.abs(
    mixedCurrency.legs[1].localAmount -
      mixedCurrency.legs[1].amount * mixedCurrency.legs[1].destination.perUSD,
  ) < 0.01,
  'the local amount is the leg cost at the destination rate',
)

const single = estimateTrip({ ...DEFAULT_INPUTS, legs: legs(['tokyo', 30]) })
ok(single.local !== null, 'a one-stop trip still exposes a local currency figure')
ok(single.local!.currency === 'JPY', 'the local currency follows the destination')

// --------------------------------------------------------------- airfare rules
section('Airfare')
ok(airfareEstimate(legs(['paris', 10], ['rome', 4]), 'none') === 0, 'no airfare costs nothing')
ok(
  airfareEstimate(legs(['paris', 10], ['rome', 4]), 'roundtrip') ===
    airfareEstimate(legs(['paris', 10]), 'roundtrip'),
  'two stops in the same region cost one return ticket',
)
ok(
  airfareEstimate(legs(['paris', 10], ['tokyo', 4]), 'roundtrip') >
    airfareEstimate(legs(['paris', 10]), 'roundtrip'),
  'stops on different regions cost more airfare',
)
ok(
  Math.abs(
    airfareEstimate(legs(['paris', 10], ['tokyo', 4]), 'oneway') * 2 -
      airfareEstimate(legs(['paris', 10], ['tokyo', 4]), 'roundtrip'),
  ) < 0.01,
  'one-way airfare is half of the return fare',
)

// ----------------------------------------------------------------- visa rules
section('Visa')
const schengen = visaEstimate(legs(['paris', 10], ['rome', 4]))
ok(schengen.groups.length === 1, 'two Schengen stops share one visa')
ok(schengen.groups[0] === 'Schengen', 'the shared group is named Schengen')
ok(schengen.amount === 90, 'one Schengen visa is charged, not two')
const twoRegions = visaEstimate(legs(['paris', 10], ['tokyo', 4]))
ok(twoRegions.groups.length === 2, 'visas are charged per visa group')
ok(twoRegions.amount === 90 + 30, 'Schengen and Japan visas add up')

// --------------------------------------------------------- category selection
section('Category selection')
const foodOnly = estimateTrip({ ...DEFAULT_INPUTS, categories: ['food'] })
ok(foodOnly.categories.length === 1, 'only the selected category is calculated')
ok(foodOnly.categories[0].key === 'food', 'the right category survived')
ok(foodOnly.livingTotal < base.livingTotal, 'calculating less costs less')
ok(foodOnly.grandTotal < base.grandTotal, 'the headline total drops too')
ok(
  foodOnly.excludedCategories.length === ALL_CATEGORY_KEYS.length - 1,
  'the excluded categories are reported',
)
const noCategories = estimateTrip({ ...DEFAULT_INPUTS, categories: [] })
ok(noCategories.livingTotal === 0, 'no categories means no living costs')
ok(
  noCategories.categories.every((c) => c.share === 0),
  'shares are zero when nothing is selected',
)

for (const key of ALL_CATEGORY_KEYS) {
  const only = estimateTrip({ ...DEFAULT_INPUTS, categories: [key] })
  ok(only.categories.length === 1 && only.categories[0].key === key, `${key} can be selected alone`)
  ok(only.livingTotal > 0, `${key} produces a positive cost`)
}

// --------------------------------------------------------------- custom costs
section('Custom costs')
const custom: CustomCost[] = [
  { id: 'c1', label: 'Souvenirs', amount: 200, mode: 'total', enabled: true },
  { id: 'c2', label: 'Shopping', amount: 10, mode: 'daily', enabled: true },
]
const withCustom = estimateTrip({ ...DEFAULT_INPUTS, customCosts: custom })
ok(
  withCustom.oneOffs.some((o) => o.key === 'c1' && o.amount === 200),
  'a one-off custom cost appears in the one-off list',
)
ok(
  withCustom.categories.some((c) => c.key === 'c2' && c.amount === 300),
  'a per-day custom cost is multiplied by the trip length',
)
ok(withCustom.grandTotal > base.grandTotal, 'custom costs increase the headline total')
ok(
  withCustom.categories.find((c) => c.key === 'c2')?.kind === 'custom',
  'custom costs are flagged as custom in the breakdown',
)

const disabledCustom = estimateTrip({
  ...DEFAULT_INPUTS,
  customCosts: custom.map((c) => ({ ...c, enabled: false })),
})
ok(
  Math.abs(disabledCustom.grandTotal - base.grandTotal) < 0.01,
  'a disabled custom cost is ignored',
)

// ------------------------------------------------------------- budget checks
section('Budget comparison')
ok(checkBudget(base, null) === null, 'a null budget produces no comparison')
const under = checkBudget(base, base.grandTotal * 2)
ok(under?.status === 'under', 'twice the budget should read as under budget')
const tight = checkBudget(base, base.grandTotal)
ok(tight?.status === 'tight', 'an exact match should read as tight')
const over = checkBudget(base, base.grandTotal * 0.5)
ok(over?.status === 'over', 'half the budget should read as over budget')
ok(over!.difference < 0, 'an over-budget trip has a negative difference')

// ------------------------------------------------------------- URL encoding
section('Shareable links')
const custom2: TripInputs = {
  legs: legs(['paris', 10], ['rome', 4]),
  travelers: 3,
  tier: 'comfort',
  airfare: 'oneway',
  categories: ['food', 'accommodation'],
  customCosts: custom,
  includeVisa: false,
  includeInsurance: true,
  includeSetup: false,
}
/**
 * Compares two calculator states. Category order is not meaningful — the
 * encoder sorts them so the same selection always produces the same URL.
 */
function sameState(a: TripInputs, b: TripInputs): boolean {
  const norm = (s: TripInputs) => ({
    ...s,
    categories: [...s.categories].sort(),
    legs: s.legs.map((l) => ({ ...l })),
    customCosts: s.customCosts.map((c) => ({ ...c })),
  })
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b))
}

const encoded = encodeState(custom2)
const roundTripped = decodeState(encoded)
ok(sameState(roundTripped, custom2), 'state must survive an encode/decode round trip')
ok(encoded.includes('l='), 'legs are encoded')
ok(encoded.includes('c='), 'the category selection is encoded')
ok(encoded.includes('x='), 'custom costs are encoded')
ok(decodeState(encodeState(DEFAULT_INPUTS)).legs.length === 1, 'default state round-trips one leg')

// Legacy single-destination links must still work.
const legacy = decodeState('?d=tokyo&n=45&t=comfort')
ok(legacy.legs.length === 1, 'a legacy link resolves to one leg')
ok(legacy.legs[0].destinationId === 'tokyo', 'the legacy destination is preserved')
ok(legacy.legs[0].days === 45, 'the legacy day count is preserved')
ok(legacy.tier === 'comfort', 'the legacy tier is preserved')

ok(
  decodeState('?n=abc').legs[0].days === DEFAULT_INPUTS.legs[0].days,
  'garbage input falls back',
)
ok(decodeState('?l=paris:99999').legs[0].days === 1095, 'out-of-range days are clamped')
ok(decodeState('?t=bogus').tier === DEFAULT_INPUTS.tier, 'an unknown tier falls back')
ok(decodeState('?c=bogus,food').categories.length === 1, 'unknown categories are dropped')
ok(decodeState('?a=bogus').airfare === DEFAULT_INPUTS.airfare, 'an unknown airfare falls back')
ok(findDestination('atlantis') === DESTINATIONS[0], 'unknown destinations fall back')

// Labels containing the separator characters must not corrupt the encoding.
const nasty: CustomCost[] = [
  { id: 'c1', label: 'Souvenirs ~; weird', amount: 25, mode: 'total', enabled: true },
]
const nastyRound = decodeState(encodeState({ ...DEFAULT_INPUTS, customCosts: nasty }))
ok(nastyRound.customCosts.length === 1, 'a label with separators still round-trips')
ok(nastyRound.customCosts[0].amount === 25, 'the amount survives the encoding')

// ---------------------------------------------------------------- formatting
section('Formatting')
ok(formatUSD(1234) === '$1,234', `formatUSD produced "${formatUSD(1234)}"`)
ok(formatLocal(50000, '¥') === '¥50,000', `formatLocal produced "${formatLocal(50000, '¥')}"`)
ok(describeDuration(30) === '1 month', '30 days reads as one month')
ok(describeDuration(120) === '4 months', '120 days reads as four months')
ok(describeDuration(7) === '1 week', '7 days reads as one week')
ok(describeDuration(365) === '1 year', '365 days reads as one year')

console.log(
  `\n${failures === 0 ? '✓' : '✗'} ${checks - failures}/${checks} checks passed` +
    (failures ? ` — ${failures} FAILED` : ''),
)
process.exit(failures === 0 ? 0 : 1)
