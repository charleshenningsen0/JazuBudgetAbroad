/**
 * Sanity checks for the budget engine.
 * Run with: npm run verify
 */
import { DESTINATIONS, findDestination } from '../src/data/destinations'
import { TIERS, findTier } from '../src/data/tiers'
import { DEFAULT_INPUTS, checkBudget, estimateTrip } from '../src/lib/calc'
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
ok(
  findTier('frugal').mult.lodging < findTier('premium').mult.lodging,
  'premium lodging multiplier must exceed frugal',
)

// ------------------------------------------------------------------ estimates
section('Trip estimates')
const base = estimateTrip(DEFAULT_INPUTS)
ok(base.grandTotal > 0, 'total must be positive')
ok(
  Math.abs(base.categories.reduce((s, c) => s + c.amount, 0) - base.livingTotal) < 0.01,
  'categories must sum to the living total',
)
ok(
  Math.abs(
    base.categories.reduce((s, c) => s + c.share, 0) - 1,
  ) < 0.0001,
  'category shares must sum to 1',
)
ok(base.oneOffTotal > 0, 'one-off costs should be included by default')
ok(base.contingency > 0, 'contingency must be positive')
ok(
  Math.abs(base.perTraveler - base.grandTotal / DEFAULT_INPUTS.travelers) < 0.01,
  'per-traveler must divide the total',
)
ok(
  Math.abs(base.perDay - base.grandTotal / DEFAULT_INPUTS.days) < 0.01,
  'per-day must divide the total',
)
ok(
  Math.abs(base.perWeek - base.grandTotal / (DEFAULT_INPUTS.days / 7)) < 0.01,
  'per-week must divide the total',
)
ok(
  Math.abs(base.local.amount - base.grandTotal * base.destination.perUSD) < 0.01,
  'local currency amount must equal the USD total times the reference rate',
)

// Scaling checks
const doubleStay = estimateTrip({ ...DEFAULT_INPUTS, days: DEFAULT_INPUTS.days * 2 })
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

// Every destination must produce a sane estimate at every tier.
section('All destinations × all tiers')
for (const d of DESTINATIONS) {
  for (const tier of TIERS) {
    const est = estimateTrip({ ...DEFAULT_INPUTS, destinationId: d.id, tier: tier.id })
    ok(est.grandTotal > 0 && Number.isFinite(est.grandTotal), `${d.city}/${tier.name}: bad total`)
    ok(
      est.perDay > 0 && Number.isFinite(est.perDay),
      `${d.city}/${tier.name}: bad per-day total`,
    )
  }
}

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
const encoded = encodeState(DEFAULT_INPUTS)
ok(encoded === '', 'default state should produce a clean URL')
const custom = {
  destinationId: 'tokyo',
  days: 120,
  travelers: 3,
  tier: 'comfort' as const,
  airfare: 'oneway' as const,
  includeVisa: false,
  includeInsurance: true,
  includeSetup: false,
}
const roundTripped = decodeState(encodeState(custom))
ok(
  JSON.stringify(roundTripped) === JSON.stringify(custom),
  'state must survive an encode/decode round trip',
)
ok(
  decodeState('?n=abc').days === DEFAULT_INPUTS.days,
  'garbage input must fall back to the default',
)
ok(decodeState('?n=99999').days === 1095, 'out-of-range values must be clamped')
ok(decodeState('?t=bogus').tier === DEFAULT_INPUTS.tier, 'an unknown tier must fall back')
ok(decodeState('?d=atlantis').destinationId === 'atlantis', 'unknown ids are preserved for lookup')
ok(findDestination('atlantis') === DESTINATIONS[0], 'unknown ids fall back to the first destination')

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
