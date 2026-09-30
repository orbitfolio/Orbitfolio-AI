# Phase 9: Sector-Aware Risk Scoring (Risk Adapter)

**Status**: ✅ Complete  
**Date**: December 2025 (Retroactive)

## Files Created/Modified

### Created
- `src/lib/scoring/altman-z.ts` - Altman Z-Score variants
- `src/lib/scoring/bank-risk.ts` - Bank Z-Score model

### Modified
- `src/lib/scoring/orbitfolio-score.ts` - Added risk adapter logic

## Behavior Changes
1. Implemented `RiskSectorAdapter` for dynamic risk model selection
2. Added three Altman Z variants:
   - Original (manufacturing)
   - Double-prime (service/tech)
   - Emerging markets
3. Added Bank Z-Score for financial institutions
4. "Oven Dial" calibration: weight reduced from 1.5 to 1.2
5. Technical Base reduced from 5.0 to 4.5

## Commands to Run
```bash
npm run dev
# Test: GET /api/orbitfolio-score?symbol=TD.TO (should use Bank Z)
# Test: GET /api/orbitfolio-score?symbol=MSFT (should use Altman Z'')
```

## Tests Added
- Verified TD.TO and RY.TO use Bank Z-Score
- Verified MSFT, NVDA use Altman Z'' (double-prime)

## Assumptions Made
- Sector detection from Yahoo Finance is reliable
- Bank Z-Score thresholds are appropriate

## Risks Remaining
- Some edge cases may use wrong model
- Insurance companies not fully covered
