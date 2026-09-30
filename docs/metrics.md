# Metrics

Orbitfolio uses only Vercel Hobby-tier first-party instrumentation:

- `@vercel/analytics` in the root layout
- `@vercel/speed-insights` in the root layout

No Sentry, no paid analytics, no third-party session replay. These packages no-op or stay within Vercel Hobby when the app is hosted on Vercel.
