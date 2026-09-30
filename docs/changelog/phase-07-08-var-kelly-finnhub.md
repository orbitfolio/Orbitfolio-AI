# Phase 7-8: VaR & Kelly Criterion + Finnhub Integration

**Status**: ✅ Complete  
**Date**: December 2025 (Retroactive)

## Files Created/Modified

### Created
- `src/lib/api/finnhub.ts` - Finnhub API client for analyst data
- Portfolio optimization utilities (Kelly Criterion, VaR)

## Behavior Changes
1. Integrated Finnhub for analyst recommendations and price targets
2. Added `calculateAnalystScore` for US stocks
3. Implemented basic VaR and Kelly Criterion calculations

## Commands to Run
```bash
npm run dev
# Check rawData.analystCoverage in API response
```

## Tests Added
- Manual tests for MSFT, NVDA, GOOGL analyst data

## Assumptions Made
- Finnhub free tier (60 req/min) is sufficient
- Analyst consensus is a useful signal

## Risks Remaining
- Finnhub doesn't cover international stocks well
- VaR calculations may need refinement
