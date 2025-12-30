# Phase 2: Intelligent Sentiment & News

**Status**: ✅ Complete  
**Date**: December 28, 2025  

## Files Created/Modified

### Created
- `src/lib/news/india-sources.ts` - India RSS news fetcher (ET, Moneycontrol, Mint)
- `src/lib/news/sentiment-engine.ts` - FinBERT + 7D Scorer
- `src/lib/ai/multi-model-router.ts` - Groq → Mistral fallback router

### Modified
- `src/app/api/orbitfolio-score/route.ts` - Integrated India news and 7D sentiment
- `src/lib/scoring/orbitfolio-score.ts` - Added sentiment7D to breakdown

## Behavior Changes
1. India stocks now fetch news from ET, Moneycontrol, Mint RSS feeds
2. Headlines filtered using FinBERT (drops neutral/low-confidence)
3. 7-Dimension sentiment analysis via Groq (llama-3.3-70b)
4. Switched from Gemini (rate-limited) to Groq-first router
5. Sentiment breakdown now visible in API response

## Commands to Run
```bash
npm run build
npm run dev
# Test: GET /api/orbitfolio-score?symbol=RELIANCE.NS
```

## Tests Added
- Smoke test: RELIANCE.NS, TCS.NS with India news
- Verified Groq scoring in <500ms

## Assumptions Made
- RSS feeds remain stable and accessible
- FinBERT threshold 0.6 is optimal
- Groq 14K RPD is sufficient

## Risks Remaining
- RSS parsing may break if feed format changes
- No caching for repeated news fetches
- Sentiment weight (10%) may need tuning based on backtest
