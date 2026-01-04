# OrbitFolio Project Specification

## Overview
OrbitFolio is an AI-powered portfolio analyzer and tracker for multi-market investments. It provides intelligent stock scoring, risk analysis, and portfolio optimization recommendations.

## Scope
| Feature | Status | Phase |
|---------|--------|-------|
| Multi-market stock scoring (US, CA, IN) | ✅ Complete | Core |
| Technical analysis (RSI, MACD, SMA) | ✅ Complete | Core |
| Fundamental analysis (Piotroski, Altman Z) | ✅ Complete | Core |
| Bank-specific risk model (Bank Z-Score) | ✅ Complete | Core |
| 7-Dimension sentiment scoring (Groq) | ✅ Complete | Phase 11/12 |
| Macro Regime HUD (+4/-4 checklist) | ✅ Complete | Phase 11/12 |
| Enterprise Security & Auth Middleware | ✅ Complete | Phase 13 |
| Portfolio Multi-Agent Logic (Kelly/VaR) | 🔲 Planned | Phase 14 |
| Chat Interface & Reddit Sentiment | 🔲 Planned | Phase 14 |
| Predictive Dashboard & Backtesting | 🔲 Planned | Phase 15 |


## Constraints
1. **Zero Budget**: All APIs must be free-tier (Yahoo Finance, TwelveData 800/day, Groq 14K/day)
2. **Privacy**: No user data stored without consent
3. **Performance**: API responses under 10 seconds
4. **Accuracy**: Stock scores must be reproducible and auditable

## Technology Stack
| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Vanilla CSS with variables |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel (free tier) |
| AI Providers | Groq (primary), Mistral (fallback) |

## Assumptions
1. User is non-technical and expects a premium, intuitive UI
2. Market data is delayed (not real-time) for free-tier compliance
3. Scoring weights may evolve based on backtesting results
4. Indian market coverage uses RSS feeds (no direct API)

## Exclusions (Not in Scope)
- Cryptocurrency tracking (future consideration)
- Options/derivatives analysis
- Real-time streaming prices
- Mobile native app (web-first approach)

## Success Criteria
1. Orbit AI Score reproduces consistently across runs
2. Smoke tests pass for 8 benchmark stocks
3. User can track portfolios across US, CA, IN markets
4. UI receives positive feedback for visual appeal
