# JazuBudget Abroad

A study abroad budget calculator. Pick a destination, a length of stay and a
spending tier, and it tells you how much money to bring — broken down by
category, converted to local currency, and checkable against the budget you
actually have.

**Live site:** https://jazubudget-abroad.vercel.app
**Backup site (GitHub Pages):** https://charleshenningsen0.github.io/JazuBudgetAbroad/

---

## Why Vite

For "the quickest React framework", Vite is the right answer:

| | Create React App | Next.js | **Vite** |
|---|---|---|---|
| Dev server start | ~30s | ~10s | **~100ms** |
| Dev server rebuild | 2–10s | 1–5s | **~50ms** |
| Deploy target | needs config | needs config | **static files** |
| Hosted free | anywhere | needs Node host | **any static host** |

Vite gives you a real React app with a config-free production build that
outputs a plain `dist/` folder. That folder can be hosted on Vercel, Netlify,
Cloudflare Pages or GitHub Pages for free, with no server to pay for.

React 19 + TypeScript, zero runtime dependencies beyond React itself.

---

## Getting started locally

```bash
npm install       # install dependencies
npm run dev       # start the dev server at http://localhost:5173
```

Other commands:

```bash
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build locally
npm run verify    # run the calculation engine test suite
npm run audit     # headless-Chrome layout audit (needs the dev server running)
npm run lint      # lint with oxlint
npm run check     # lint + verify + build  ← run this before committing
```

---

## How the calculation works

The model is deliberately simple so you can reason about every number.

**1. Each destination has a "typical student" daily cost, in USD.**

| Field | Meaning |
|---|---|
| `lodging` | per **night** — hostel / dorm / budget guesthouse |
| `food` | per **day** — groceries plus one cheap meal out |
| `transit` | per **day** — local transport passes, occasional rideshare |
| `activities` | per **day** — museums, events, coffee, nightlife |
| `extras` | per **day** — SIM top-ups, souvenirs, laundry, snacks |

Plus `flight` (indicative round-trip fare), `visa` (student visa / entry fee),
`currency` + `perUSD` (reference exchange rate), and a `tip` of local advice.

**2. The spending tier scales those numbers.**

| Tier | Lodging | Food | Transit | Activities | Extras | Setup | Buffer |
|---|---|---|---|---|---|---|---|
| Frugal | ×0.75 | ×0.65 | ×0.80 | ×0.60 | ×0.50 | $120 | 12% |
| Standard | ×1.00 | ×1.00 | ×1.00 | ×1.00 | ×1.00 | $180 | 10% |
| Comfort | ×1.50 | ×1.35 | ×1.35 | ×1.60 | ×1.70 | $260 | 8% |
| Premium | ×2.60 | ×1.90 | ×1.90 | ×2.60 | ×2.60 | $400 | 7% |

Accommodation has the widest spread across tiers (a bed is cheap but a hotel
is not) while food has the narrowest (everyone has to eat). The buffer shrinks
as the tier rises, because a bigger budget already absorbs shocks.

**3. The estimate is assembled.**

```
living    = lodging×nights + (food + transit + activities + extras)×days
one-offs = flights + visa + insurance + setup
total    = (living + one-offs) × (1 + buffer)
```

Accommodation is charged per *night* (a 30-day trip has 29 nights); everything
else is per *day*. Insurance is prorated at $30 per month. The group total is
then divided by the number of students to give the per-traveler figure.

**4. Everything is shareable.** The calculator state is encoded in the query
string, so `?d=tokyo&n=120&t=comfort&p=2` reproduces the exact calculation.
The "Share" button copies that link.

---

## Project structure

```
src/
├── App.tsx                    # layout, state, share + URL sync
├── index.css                  # design tokens, light/dark themes, print styles
├── data/
│   ├── destinations.ts        # 50 destinations with cost data
│   └── tiers.ts               # the four spending tiers
├── lib/
│   ├── calc.ts                # the estimate engine (pure functions)
│   ├── format.ts              # currency and duration formatting
│   ├── tips.ts                # destination-aware saving tips
│   └── urlState.ts            # encode/decode state to the URL
└── components/
    ├── DestinationPicker.tsx  # searchable combobox with region filters
    ├── TierSelector.tsx       # the four tier cards
    ├── TripDetails.tsx        # length, travellers, flights, toggles
    ├── NumberField.tsx        # number input that survives being cleared
    ├── BudgetField.tsx        # optional "my budget" input
    ├── BudgetCheckCard.tsx    # under / tight / over comparison
    ├── BreakdownBars.tsx      # category breakdown visualisation
    ├── ResultsPanel.tsx       # headline, stats, breakdown, one-offs, tips
    └── Icons.tsx              # inline SVG icons (no icon dependency)

scripts/
├── verify.ts                  # 671 assertions over the engine
├── layout-audit.mjs           # headless Chrome layout/responsive check
└── interaction-test.mjs       # headless Chrome end-to-end interaction test
```

---

## Deployment

The app is a **static site** — `npm run build` produces a `dist/` folder that
any static host can serve. There is no backend, no database and no API key.

### Option A — Vercel (already live)

```bash
npm install -g vercel      # once
vercel login               # once
vercel                     # preview deploy
vercel --prod              # production deploy
```

Settings Vercel auto-detected:

- Framework: **Vite**
- Build command: `npm run build`
- Output directory: `dist`

**Important:** Vercel enables *Vercel Authentication* (SSO) on new projects by
default, which would show your friends a login screen instead of the app. It
has been disabled for this project. If you ever see a login wall, turn it off:

```bash
printf '{"ssoProtection":null}' > /tmp/body.json
vercel api /v9/projects/jazubudget-abroad -X PATCH --input /tmp/body.json
```

Or in the dashboard: **Project → Settings → Deployment Protection → Disabled**.

The `jazubudget-abroad.vercel.app` alias is what you share. It is exempt from
Vercel's 30-day Hobby deployment retention, so it keeps serving as long as the
alias points at it.

### Option B — GitHub Pages (already live, permanent)

This is the most durable free option: Pages sites never expire.

1. `.github/workflows/deploy-pages.yml` is already in the repo. It builds and
   publishes `dist/` on every push to `main`.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub
   Actions**.
3. The site appears at `https://<user>.github.io/<repo>/`.

Because `vite.config.ts` uses `base: './'`, the same build works at a domain
root *and* in a repository sub-path — no extra configuration.

### Option C — Netlify

```bash
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

Or drag the `dist` folder onto <https://app.netlify.com/drop> in your browser.

Settings: build command `npm run build`, publish directory `dist`.

### Option D — Cloudflare Pages

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy dist --project-name jazubudget-abroad
```

Settings: build command `npm run build`, output directory `dist`.

---

## Keeping it up to date

```bash
git add -A
git commit -m "your message"
git push
```

- **GitHub Pages** redeploys automatically (the workflow triggers on push).
- **Vercel** redeploys automatically if you connect the GitHub repo in the
  dashboard (*Project → Settings → Git*), otherwise run `vercel --prod` again.

---

## Customising it

**Add a destination** — append an object to `DESTINATIONS` in
`src/data/destinations.ts`:

```ts
{
  id: 'reykjavik',
  city: 'Reykjavík',
  country: 'Iceland',
  region: 'Europe',
  currency: 'ISK',
  symbol: 'kr',
  perUSD: 138,       // units of ISK per 1 USD
  lodging: 40,       // USD per night
  food: 22,
  transit: 6,
  activities: 14,
  extras: 11,
  flight: 700,       // USD round-trip
  visa: 0,
  tip: 'The bus to the Blue Lagoon is a big one-off — book it with your flight.',
}
```

The id must be lowercase with no spaces — it becomes part of the share URL.

**Adjust a tier** — edit the multipliers in `src/data/tiers.ts`. The engine
reads them directly, so no other file needs to change.

**Change the currency reference rates** — update `perUSD` in
`src/data/destinations.ts`. These are planning figures; tell users to check
the live rate before they travel (the app already says so on screen).

---

## Testing

```bash
npm run verify                       # engine test suite, no browser needed
npm run dev                          # in one terminal
npm run audit                        # responsive layout audit
node scripts/interaction-test.mjs    # end-to-end interaction test
node scripts/interaction-test.mjs https://jazubudget-abroad.vercel.app/  # test production
```

`verify.ts` covers the data (every destination has positive costs and a valid
currency), the maths (categories sum to the total, shares sum to 1, totals
scale correctly with length and group size), the budget comparison thresholds,
and the URL encode/decode round trip.

`interaction-test.mjs` drives a real headless Chrome through picking a
destination, changing tier, applying a length preset, entering a budget,
confirming the URL updates and reloading to confirm the state is restored.

---

## A note on the numbers

These are planning-grade estimates built from typical student costs and
reference exchange rates — they are not quotes. Actual prices depend on the
season, the exchange rate on the day you change money, how early you book
housing, and how hard you shop for student discounts. Always confirm with
your university's financial aid office before committing to a budget.
