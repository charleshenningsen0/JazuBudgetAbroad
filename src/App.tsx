import { useEffect, useMemo, useState } from 'react'
import { DestinationPicker } from './components/DestinationPicker'
import { TierSelector } from './components/TierSelector'
import { TripDetails } from './components/TripDetails'
import { ResultsPanel } from './components/ResultsPanel'
import { BudgetCheckCard } from './components/BudgetCheckCard'
import { BudgetField } from './components/BudgetField'
import { IconPlane, IconPrint, IconShare } from './components/Icons'
import { DEFAULT_INPUTS, checkBudget, estimateTrip } from './lib/calc'
import type { TripInputs } from './lib/calc'
import { buildTips } from './lib/tips'
import { formatUSD } from './lib/format'
import { decodeState, encodeState, shareUrl } from './lib/urlState'

export default function App() {
  const [inputs, setInputs] = useState<TripInputs>(() =>
    decodeState(window.location.search),
  )
  const [budget, setBudget] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  // Keep the URL in sync so the current calculation is always shareable.
  useEffect(() => {
    const next = `${window.location.pathname}${encodeState(inputs)}`
    window.history.replaceState(null, '', next)
  }, [inputs])

  const estimate = useMemo(() => estimateTrip(inputs), [inputs])
  const budgetCheck = useMemo(() => checkBudget(estimate, budget), [estimate, budget])
  const tips = useMemo(
    () => buildTips(estimate.destination, estimate.tier, inputs.days, estimate.perDay),
    [estimate, inputs.days],
  )

  function update(patch: Partial<TripInputs>) {
    setInputs((prev) => ({ ...prev, ...patch }))
  }

  function reset() {
    setInputs(DEFAULT_INPUTS)
    setBudget(null)
  }

  async function copyLink() {
    const url = shareUrl(inputs)
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard may be blocked (insecure context); fall back to a prompt.
      window.prompt('Copy this link to share your calculation:', url)
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="wrap header-inner">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <IconPlane />
            </span>
            <span className="brand-text">
              <span className="brand-name">JazuBudget Abroad</span>
              <span className="brand-tagline">
                How much should I budget for my study abroad trip?
              </span>
            </span>
          </div>
          <div className="header-actions">
            <button type="button" className="btn btn--ghost" onClick={reset}>
              Reset
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => window.print()}>
              <IconPrint />
              Print
            </button>
            <button type="button" className="btn btn--primary" onClick={copyLink}>
              <IconShare />
              {copied ? 'Link copied!' : 'Share'}
            </button>
          </div>
        </div>
      </header>

      <main className="wrap main">
        <section className="card card--form">
          <h2 className="card-title card-title--lead">Plan your trip</h2>

          <DestinationPicker value={inputs.destinationId} onChange={(id) => update({ destinationId: id })} />

          <TierSelector value={inputs.tier} onChange={(id) => update({ tier: id })} />

          <TripDetails inputs={inputs} onChange={update} />

          <div className="field">
            <label className="field-label" htmlFor="budget">
              What budget do you have? (optional)
            </label>
            <BudgetField value={budget} onChange={setBudget} />
          </div>

          {budgetCheck && <BudgetCheckCard check={budgetCheck} />}
        </section>

        <section className="results" id="results">
          <ResultsPanel estimate={estimate} tips={tips} />
        </section>
      </main>

      {/* Sticky total so the live number stays visible while adjusting inputs on small screens. */}
      <div className="sticky-total" aria-live="polite">
        <div className="sticky-total-inner">
          <span className="sticky-total-label">
            {estimate.destination.city} &middot; {estimate.inputs.days} days
          </span>
          <span className="sticky-total-value">{formatUSD(estimate.grandTotal)}</span>
        </div>
        <a className="btn btn--primary sticky-total-btn" href="#results">
          See breakdown
        </a>
      </div>

      <footer className="site-footer">
        <div className="wrap">
          <p>
            <strong>JazuBudget Abroad</strong> — a student travel budget planner. Estimates are
            planning-grade figures based on typical student costs and reference exchange rates,
            not quotes. Always confirm with your university&rsquo;s financial aid office and the
            destination&rsquo;s official visa site.
          </p>
          <p className="footer-meta">Built with React + Vite · free static hosting</p>
        </div>
      </footer>
    </div>
  )
}
