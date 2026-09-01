# Orbitfolio

Mobile-first Android PWA for tracking a demo portfolio and scoring every holding with three research pillars:

1. Technicals (12-1 momentum, price vs SMA200, SMA 50/200 cross, 52-week high, ADX-gated RSI, relative volume). MACD is computed for display only and is **not** scored.
2. Fundamentals (available PE, PB, ROE, margins, leverage, 52-week position)
3. Third-party analyst consensus (Yahoo recommendation trend)

Public analysis may show the Orbit score (0–10), a client action of **Buy / Hold / Sell**, a short rationale, and street consensus. That is research guidance, not personalized or regulated investment advice. Portfolio health uses A+ to F as a grade, not a trade.

v1 is a finished demo app: no login required. Holdings persist in **localStorage on this device only**. Export, import, or clear them from Settings.

## Methodology (README only)

These numbers are the product lock. They are **not** shown on the public analysis UI.

- Pillar weights: **35% technical / 35% fundamental / 30% analyst** (renormalized if analyst data is missing). Implemented in `lib/market/rating.ts`.
- Client action from Orbit score: **Buy ≥ 6.5**, **Hold ≥ 4.0**, otherwise Sell. Tests in `tests/rating.test.ts` assert this.
- Prices and research inputs: Yahoo public endpoints (no API key).
- Optional Groq (`GROQ_API_KEY`) writes a two-sentence rationale; otherwise a deterministic template.

## What this repo actually has

- Next.js 16 App Router, React 19, TypeScript, Tailwind
- Dark finance UI with sticky header and bottom nav (Dashboard, Holdings, Analysis, Settings)
- Public APIs: /api/search, /api/quotes, /api/analysis, POST /api/analysis/portfolio, GET /api/health
- Protected /api/holdings (Supabase session) kept from prior work; auth is checked in the route handler
- Shared cache: in-memory getCacheManager() plus Upstash Redis when configured, JSON files under data/cache/market/ as local fallback (quotes 15 min, analysis 6 hours)
- Optional Groq 2-sentence rationale when GROQ_API_KEY is set; otherwise a deterministic template
- PWA manifest, apple-touch-icon.png, icon-192/512 (`purpose: any`). No service worker. No maskable icon (same asset is not dual-purposed).
- Vercel Analytics + Speed Insights (Hobby only). See `docs/metrics.md`.

Not built: live OAuth UI (Google/GitHub buttons hide unless Supabase public env is present), crypto, mutual funds, shadcn, TradingView charts, 120k ticker index, 500k-user infrastructure claims. CSV import is on Holdings (ticker,quantity,cost_price). Chat, backtesting, extra oscillators, Sentry, and Playwright are out of scope.

## Run locally

```bash
npm install
cp .env.example .env.local   # optional
npm run dev
```

Next.js prints the URL. Default is **http://localhost:3000**. If 3000 is already in use, Next binds the next free port (often 3001).

```bash
npm test          # node tests/run.cjs
npm run lint
npm run build
```

Useful scripts in package.json: `dev`, `test`, `lint`, `build`, `start`.

## Demo mode

On first visit the app seeds six holdings: AAPL, MSFT, NVDA, RELIANCE.NS, INFY.NS, SHOP.TO. Add / edit / delete from Holdings, or import CSV. Settings can export / import / clear holdings JSON (this device only). Ticker search uses Yahoo. Dashboard rates every holding automatically after quotes load (concurrency 3).

Empty holdings is a call-to-action, not an error.

## Environment variables (all optional)

Copy `.env.example`. Do not commit secrets. Read them from process.env.

- `GROQ_API_KEY`: optional 2-sentence rationale via existing Groq client
- `NEXT_PUBLIC_SUPABASE_URL`: optional auth; enables Google/GitHub on /login and /api/holdings
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: optional auth
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: optional shared cache and rate limit (100 req/hour/IP). No-ops if unset

Yahoo has no key. Twelve Data is unused.

Without any of these, demo mode still works (Yahoo + in-memory cache + template rationale).

## Android add to Home Screen

Open the site in Chrome on Android. Menu, then Add to Home screen / Install app. Launch; it opens standalone at /dashboard.

A service worker is not bundled. Manifest and metadata are enough for installability without caching Yahoo HTML.

## Free-tier caching (about 5,000 users)

Yahoo is fetched server-side only. The client talks to same-origin /api. Quotes cache 15 minutes; analysis caches 6 hours, keyed by symbol plus UTC date. Popular tickers collapse to one Yahoo fetch per cache window, which is the main lever for a free Vercel instance. This is not a 500k-user guarantee.

Upstash Redis is optional and shared across users when set (UPSTASH_REDIS_REST_URL + TOKEN). Without it, cache is in-process memory plus local JSON files under data/cache/market/ (memory resets on deploy / cold start).

`Cache-Control: public` is set only on `/api/quotes`, `/api/search`, and `/api/analysis`. Holdings and other private routes use `private, no-store`.

## Guidance vs advice

- Public analysis: Orbit score, Buy/Hold/Sell, short rationale, street consensus. Not the 35/35/30 formula.
- Research labels (Robust / Constructive / Mixed / Cautious / Fragile) describe setup quality.
- Analyst `recommendationKey` is displayed as third-party consensus, never as Orbitfolio advice.
- Compact “not investment advice” line in the app shell; Terms, Privacy, and Compliance pages from the marketing footer.

## API

- GET /api/search?q= (public)
- GET /api/quotes?symbols=AAPL,MSFT,RELIANCE.NS (public)
- GET /api/analysis?symbol=AAPL (public)
- POST /api/analysis/portfolio with { symbols: string[] } (public, concurrency 3)
- GET /api/health → `{ ok: true }` (no-store)
- GET/POST /api/holdings (session required; handler checks auth)
- GET /api/test_json (development only; 404 in production)

## Yahoo / Groq limits

Yahoo public endpoints can 401/429, especially quoteSummary (crumb/cookie). Chart (/v8/finance/chart) is the price path; fundamentals and analyst data degrade to skipped fields when summary fails. Groq is unused unless a key is set (free-tier daily caps apply).

## License

MIT. See `LICENSE`.
