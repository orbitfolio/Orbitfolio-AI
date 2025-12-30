# Testing Standards (TDD Enterprise Mode)

## Test Coverage Requirements
- All new features must have unit tests
- Critical business logic must have integration tests
- API routes must have request/response tests
- Minimum 70% code coverage for production code

## Test Types
1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test API routes end-to-end
3. **Smoke Tests**: Verify critical paths work after deployment
4. **Benchmark Tests**: Validate scoring outputs for 8 standard stocks

## Naming Conventions
- Test files: `*.test.ts` or `*.spec.ts`
- Describe blocks: Feature or function name
- It blocks: "should [expected behavior] when [condition]"

## Testing Framework
- Use Vitest or Jest for unit/integration tests
- Use Playwright for E2E browser tests
- Mock external APIs in tests (never hit real endpoints)

## OrbitFolio Smoke Test Protocol
After every feature that modifies Orbit AI Score:
1. Run `npm run build` → must pass
2. Test 8 benchmark stocks via API:
   - US Tech: MSFT, NVDA, TSLA, GOOGL
   - India: RELIANCE.NS, TCS.NS
   - Canadian Banks: TD.TO, RY.TO
3. Verify feature activation:
   - Bank stocks: `academic.bankZ` present
   - Tech stocks: `academic.altmanZ` uses `double_prime`
   - Indian stocks: `dataSources.sentiment` is `true`
   - Macro HUD: `breakdown.macroRegime` present
4. Document results in `aiChangeLog/` and `ai_score_comparison.md`

## Test Organization
```
src/
  lib/
    scoring/
      orbitfolio-score.ts
      orbitfolio-score.test.ts  # Co-located tests
  __tests__/
    integration/
      api-orbitfolio-score.test.ts
```
