# Orbitfolio QA notes

Reviewed: 2026-08-31 ~5:10 PM ET (America/Toronto).
Scope: read-only review of UI, schemas, middleware, APIs, store, PWA. No app/lib/middleware edits. This file is the only QA output.

## Verdict

Demo v1 is close.
Mobile shell, seeded holdings, public APIs, guidance labels, and a PWA manifest exist.
Remaining gaps are install polish and UX holes.

## Confirmations

### 1. Guidance labels are not Orbitfolio trade actions — PASS

Live product path uses research labels only: Robust, Constructive, Mixed, Cautious, Fragile.

- lib/ai/schemas.ts: GuidanceLabelSchema is those five strings. FORBIDDEN_TRADE_ACTIONS is the banned list. Comment invariant is explicit.
- lib/market/rating.ts: labelFromScore and combineRating never emit trade verbs. Template rationale ends with the not-a-recommendation sentence.
- UI copy (landing, analysis index, symbol page, settings, CompactDisclaimer, GuidanceBadge) uses guidance language and disclaims recommendations.
- Groq path in lib/market/analyze.ts: system instruction forbids trade verbs; banned-word matches fall back to the template.
- tests/guidance.test.ts: labels exclude forbidden actions; serialized Orbitfolio fields do not contain those action words as Orbitfolio output.

Third-party analyst consensus is allowed: Yahoo recommendationKey and street counts live in lib/market/analyst.ts and AnalystRawSchema. The symbol page shows them under "Analyst consensus · third party" and "Yahoo Finance recommendation trend. Orbitfolio does not endorse this as a trade." Street key may still display raw Yahoo strings — labeled, not Orbitfolio advice.

Dead schema residue (not on v1 screens): PortfolioAnalysisSchema.recommendations.action is a free string; GemHunterResultSchema has verdict/entryZone; chat EXECUTE. Historical prompts in lib/ai/prompts/portfolio-analysis.ts mention entry/exit. Live analyzeSymbol / analyzePortfolio do not use those for UI copy. Personas are unused in the app shell.

### 2. Demo holdings store — PASS

lib/store/holdings.ts: Zustand persist, key orbitfolio-holdings-v1. Seeds AAPL, MSFT, NVDA, RELIANCE.NS, INFY.NS, SHOP.TO. Add/edit/delete locally. Quotes and analyses are in-memory only. Settings: Demo · localStorage / No login required. Dashboard/holdings/analysis read this store, not /api/holdings.

seedIfNeeded() is unused; first paint relies on default DEMO_SEED plus persist. Fine unless localStorage is corrupt.

### 3. Public APIs — PASS

Middleware isPublicApi: /api/auth, /api/search, /api/quotes, /api/analysis, /api/test_json. /api/holdings returns 401 without a Supabase session.

- GET /api/search?q= — public, Yahoo ticker search
- GET /api/quotes?symbols= — public, batch quotes (max 30)
- GET /api/analysis?symbol= — public, three-pillar score
- POST /api/analysis/portfolio { symbols } — public, concurrency 3, max 30
- GET/POST /api/holdings — session required; leftover; demo UI does not call it
- GET /api/test_json — public Groq debug leftover

Build output matches those routes. Dashboard refreshQuotes and rateAll hit the public analysis/quotes paths.

### 4. PWA manifest — PASS (with polish gaps)

public/manifest.webmanifest exists; root layout sets manifest: /manifest.webmanifest. start_url /dashboard, display standalone, orientation portrait, theme_color and background_color #070B14. Icons: icon-192.png, icon-512.png (purpose any). apple-touch-icon.png is on disk. SVG icon and favicon remain. Middleware matcher excludes the manifest and static images.

No service worker (sw.js absent) — README already says installability without offline Yahoo cache. Layout apple icon still points at /icon.svg, not apple-touch-icon.png. Manifest has no maskable 192/512.

## What works

- App shell: sticky header, bottom nav (Dashboard / Holdings / Analysis / Settings), max-w-lg, min-h-dvh, viewportFit cover, safe-area on header. Tap targets mostly 40-52px.
- Landing /: demo CTA to /dashboard, no login required.
- Dashboard: portfolio value, P&L, day change, US/IN/CA allocation, health grade plus avg Orbit score, Rate all, per-row GuidanceBadge.
- Holdings: add sheet with Yahoo search debounce (250ms), edit/delete, qty plus avg cost.
- Analysis: index plus /analysis/[symbol] with score, three pillars, technicals, fundamentals, third-party consensus block, delayed-data disclaimer.
- Settings: display currency USD/INR/CAD, Android add-to-home-screen steps, free-tier copy, legal blurb.
- Scoring: 40/35/25 weights, renormalize if analyst missing, degrade quoteSummary failures (chart still prices).
- Compliance in-product: compact Not investment advice in the shell; longer copy on analysis plus settings.
- Cache: in-memory via getCacheManager() (quotes 15 min, analysis 6h). Upstash rate limit no-ops without env.
- Groq optional: template rationale if GROQ_API_KEY is unset.

## Crash / reliability risks

None found that are one-line runtime crashes in the demo path. Ranked:

1. Yahoo 401/429 / crumb failure — quoteSummary often needs cookie plus crumb; analyze catches summary failure but chart failure 502s the whole symbol. UI shows "Could not load analysis. Yahoo may be rate-limiting this IP." Dashboard day-change falls back to cost basis. Not a JS exception, but the main live-data failure mode.
2. Sequential quote fetch — fetchQuotes charts one symbol at a time. Dashboard loads 6 holdings plus INR=X plus CAD=X = 8 serial Yahoo calls (8s timeout each). Worst case tens of seconds; Rate all is better (concurrency 3).
3. Zustand persist vs SSR — no skipHydration. Returning users with edited localStorage can hydration-mismatch on first client paint (React overlay in dev). suppressHydrationWarning on html does not cover the list.
4. Add-holding search — setHits(json.data) without Array.isArray. A 502 HTML/non-array body after res.json() can throw on hits.map.
5. decodeURIComponent(params.symbol) — malformed percent-encoding in the route param throws URIError in render. Unlikely for real tickers.
6. FX missing — convertTo returns the raw amount if INR/CAD rate is absent, so mixed-currency totals can be wrong until quotes return (not a crash).
7. Invalid save is silent — Add sheet save() returns with no error if qty/price fail validation.
8. Delete has no confirm — fat-finger deletes a holding; persist writes immediately.
9. /api/holdings vs Next 16 cookies() — still uses createRouteHandlerClient({ cookies }). Demo does not call it; wiring a session later may break. Holding Zod schema (average_price, portfolio_id) does not match the Zustand Holding shape.
10. Wide CORS — middleware sets Access-Control-Allow-Origin to request origin or *. Next Cache-Control public on all /api/* including holdings (session leak risk if auth is enabled behind a CDN).
11. Next 16 warning: middleware file convention is deprecated in favor of proxy. Build still succeeds.
12. Footer 404s — ComplianceFooter links /terms, /privacy, /compliance; those routes are not in the build table.
13. Empty app/api/auth — login Google/GitHub links 404 if NEXT_PUBLIC_SUPABASE_URL is set. Hidden in demo (no env).
14. Public /api/test_json — Groq debug; 500 without key. Should not stay public.

When analyst data is missing, combiner still stores pillars.analystConsensus: 5 (neutral) while weightsUsed.analystConsensus is 0. UI still draws a 5.0 bar. Misleading, not a crash.

## Missing vs a phone-usable v1

Already in good shape: four-tab shell, seeded demo, add/search, scoring, disclaimers, 192/512 PNG plus manifest, Android add-to-home-screen copy.

Still short of a comfortable phone v1:

- Install: layout apple icon is still /icon.svg; apple-touch-icon.png is unused. Manifest icons are purpose any only (no maskable). iOS Share then Add to Home Screen is not documented (settings is Android Chrome only). No service worker — no offline shell.
- Bottom chrome: CompactDisclaimer and the nav both apply env(safe-area-inset-bottom), so iPhone home-indicator padding is doubled and eats vertical space.
- Keyboard: add sheet is items-end with no visualViewport / keyboard inset; Android IME will cover quantity/cost.
- Empty holdings: deleting all six leaves a blank list, no CTA. seedIfNeeded never runs.
- Discoverability: holdings stay Unrated until the user taps Rate all; dashboard only auto-fetches quotes.
- Feedback: no save validation message; no delete confirm; no pull-to-refresh; Rate all can sit on Rating for a long Yahoo wait.
- Legal pages linked from the marketing footer 404.
- Accessibility: no focus trap / scroll lock on the sheet; no aria-current on nav.

Out of scope per README (do not treat as v1 bugs): OAuth UI, CSV, crypto, charts, 120k ticker index.

## Build and unit tests

Package test script (tests/run.cjs on Node v20.19.2): 12 passed, 0 failed, at 5:08 PM ET. Covers guidance labels, rating bands 40/35/25, technicals.
Production compile (Next 16.1.1 Turbopack): succeeded at 5:09 PM ET. Compile plus tsc plus 14 static pages. Middleware-deprecation warning only.
Earlier in this session, tsc --noEmit failed on lib/market/yahoo.ts:233 until the builder added extra: Record<string, string>. Current tree compiles.

node_modules was present; no competing install lock. Did not run a production server or hit live Yahoo from a browser.

Did not delete anything. Did not change app/, lib/market, middleware.ts, package.json, or README.md.

Explicit check: Orbitfolio-owned advice is not BUY, SELL, or HOLD. Those words appear only as banned lists, disclaimers, or third-party Yahoo street keys labeled as such.
