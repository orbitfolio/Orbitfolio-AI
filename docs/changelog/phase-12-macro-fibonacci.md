# aiChangeLog: Phase 11 & 12 - Advanced Sentiment & Macro HUD

## Date: January 01, 2026
**Status**: COMPLETED

## Summary
Integrated deep sentiment analysis using Groq LLM and established the "Macro Regime HUD" for broader market context. Added Fibonacci level verification for technical signals.

## Changes
### [Component] Sentiment Engine
- **Upgraded to Groq NLP**: Implemented 7-Dimension sentiment scoring (Trust, Fear, Greed, Momentum, etc.).
- **FinBERT Filtering**: Added pre-filter to reduce news noise.
- **Symbol Resolver**: Improved accuracy for multi-market symbols (RELIANCE.NS vs RELIANCE).

### [Component] Macro HUD
- **Regime Checklist**: Added +4/-4 scoring based on VIX, Yield Curve, and Dollar Index.
- **Fibonacci Verification**: Integrated 0.382, 0.5, and 0.618 level checks for entry/exit signals.

## Verification Result
- **MSFT Orbit Score**: 8.4 (Verified with Macro HUD overlay)
- **TCS.NS Orbit Score**: 7.2 (Sentiment scoring active)
- **Build Status**: Passed

## Risks & Mitigation
- **API Limits**: TwelveData limits (800/day) are stable but need monitoring.
- **LLM Cost**: Groq remains on free tier; added fallback logic to Mistral.

---
*Updated per dafqnumb protocol.*
