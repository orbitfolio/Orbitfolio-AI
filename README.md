# Orbitfolio

Mobile-first Android PWA for tracking a demo portfolio and scoring every holding with three research pillars:

1. Technicals (RSI, MACD, SMA 50/200)
2. Fundamentals (available PE, PB, ROE, margins, leverage, 52-week position)
3. Third-party analyst consensus (Yahoo recommendation trend)

Scores are guidance, not advice. Orbitfolio never outputs buy / sell / hold / trim / accumulate as its own recommendation. Portfolio health uses A+ to F as a grade, not a trade.

v1 is a finished demo app: no login required. Holdings persist in localStorage.

## What this repo actually has

- Next.js 16 App Router, React 19, TypeScript, Tailwind
- Dark finance UI with sticky header and bottom nav (Dashboard, Holdings, Analysis, Settings)
- Public APIs: /api/search, /api/quotes, /api/analysis, POST /api/analysis/portfolio
- Protected /api/holdings (Supabase session) kept from prior work
- Shared cache: in-memory getCacheManager() plus Upstash Redis when configured, JSON files under data/cache/market/ as local fallback (quotes 15 min, analysis 6 hours)
- Optional Groq 2-sentence rationale when GROQ_API_KEY is set; otherwise a deterministic template
- PWA manifest, apple-touch-icon.png, icon-192/512 (any + maskable), Android install prompt

Not built: live OAuth UI (Google/GitHub buttons hide unless Supabase public env is present), crypto, mutual funds, shadcn, TradingView charts, 120k ticker index, 500k-user infrastructure claims. CSV import is on Holdings (ticker,quantity,cost_price).

## Run locally

From the orbitfolio directory: install dependencies, then start the Next.js dev server. Open http://localhost:3000 and tap Open app (or go to /dashboard).

Useful scripts in package.json: dev, test, build, start.

## Demo mode

On first visit the app seeds six holdings: AAPL, MSFT, NVDA, RELIANCE.NS, INFY.NS, SHOP.TO. Add / edit / delete from Holdings, or import CSV. Ticker search uses Yahoo. Dashboard rates every holding automatically after quotes load (concurrency 3).

## Environment variables (all optional)

Do not commit secrets. Read them from process.env.

- GROQ_API_KEY: optional 2-sentence rationale via existing Groq client
- NEXT_PUBLIC_SUPABASE_URL: optional auth; enables Google/GitHub on /login and /api/holdings
- NEXT_PUBLIC_SUPABASE_ANON_KEY: optional auth
- UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN: optional rate limit (100 req/hour/IP). No-ops if unset

Without any of these, demo mode still works (Yahoo + in-memory cache + template rationale).

## Android add to Home Screen

Open the site in Chrome on Android. Menu, then Add to Home screen / Install app. Launch; it opens standalone at /dashboard.

A service worker is not bundled. Manifest and metadata are enough for installability without caching Yahoo HTML.

## Free-tier caching (about 5,000 users)

Yahoo is fetched server-side only. The client talks to same-origin /api. Quotes cache 15 minutes; analysis caches 6 hours, keyed by symbol plus UTC date. Popular tickers collapse to one Yahoo fetch per cache window, which is the main lever for a free Vercel instance. This is not a 500k-user guarantee.

Upstash Redis is optional and shared across users when set (UPSTASH_REDIS_REST_URL + TOKEN). Without it, cache is in-process memory plus local JSON files under data/cache/market/ (memory resets on deploy / cold start).

## Guidance vs advice

- Orbit score 0-10 plus label: Robust / Constructive / Mixed / Cautious / Fragile
- Weights: 35% technical, 35% fundamental, 30% analyst (renormalized if analyst data is missing)
- Analyst recommendationKey is displayed as third-party consensus, never as Orbitfolio action
- Compliance footer on marketing pages; compact Not investment advice line in the app shell

## API

- GET /api/search?q= (public)
- GET /api/quotes?symbols=AAPL,MSFT,RELIANCE.NS (public)
- GET /api/analysis?symbol=AAPL (public)
- POST /api/analysis/portfolio with { symbols: string[] } (public, concurrency 3)
- GET/POST /api/holdings (session required)

## Yahoo / Groq limits

Yahoo public endpoints can 401/429, especially quoteSummary (crumb/cookie). Chart (/v8/finance/chart) is the price path; fundamentals and analyst data degrade to skipped fields when summary fails. Groq is unused unless a key is set (free-tier daily caps apply).

## License

MIT
