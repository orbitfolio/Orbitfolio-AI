# Contributing

## Setup

```bash
npm install
cp .env.example .env.local   # optional; all five vars are optional
npm run dev
```

Open the URL printed by Next.js (default http://localhost:3000; Next uses the next free port if 3000 is taken).

```bash
npm test
npm run lint
npm run build
```

`npm test` runs `node tests/run.cjs`. Keep those tests passing.

## Product locks (do not drift)

- Scoring stays **35% technical / 35% fundamental / 30% analyst** in `lib/market/rating.ts`. Buy ≥ 6.5, Hold ≥ 4.0. Tests in `tests/rating.test.ts` assert this.
- Public analysis may show score, Buy/Hold/Sell, short rationale, and street consensus only. Keep the scoring formula off that UI.
- README, Settings, terms, and this file must stay in sync: Orbitfolio **does** emit Buy/Hold/Sell as research guidance. It is not advice. Holdings live in localStorage on this device.
- Do not add chat, backtesting, crypto, extra oscillators, Sentry, a service worker, Playwright, or paid analytics.

## Docs

If you change guidance copy or scoring bands, update README methodology (README only — not the public analysis screen) and Settings.
