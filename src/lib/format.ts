/** Formats a USD amount with no decimals (or two when cents matter). */
export function formatUSD(value: number, opts: { cents?: boolean } = {}): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(value)
}

/** Formats a plain number with thousands separators. */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Formats an amount in a destination's local currency.
 * The rate is a flat "units per USD" figure, so we build a currency-free
 * format (the symbol is rendered separately) to avoid misleading decimals.
 */
export function formatLocal(amount: number, symbol: string): string {
  const whole = Math.round(amount)
  return `${symbol}${formatNumber(whole)}`
}

/** "30 days" -> "1 month", "14 days" -> "2 weeks". */
export function describeDuration(days: number): string {
  if (days % 365 === 0) {
    const y = days / 365
    return `${y} ${y === 1 ? 'year' : 'years'}`
  }
  if (days % 30 === 0) {
    const m = days / 30
    return `${m} ${m === 1 ? 'month' : 'months'}`
  }
  if (days % 7 === 0) {
    const w = days / 7
    return `${w} ${w === 1 ? 'week' : 'weeks'}`
  }
  return `${days} ${days === 1 ? 'day' : 'days'}`
}
