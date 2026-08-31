import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeFundamentals } from '../lib/market/fundamentals';

test('EV/EBITDA cheap + high ROA beats cheap-P/E-but-no-cash', () => {
    const quality = computeFundamentals({
        enterpriseToEbitda: 8,
        priceToBook: 2.5,
        returnOnAssets: 0.18,
        returnOnEquity: 0.22,
        operatingMargins: 0.25,
        freeCashflow: 8e9,
        marketCap: 1e11,
        operatingCashflow: 1.2e10,
        netIncomeToCommon: 9e9,
        earningsGrowth: 0.12,
    });
    const cheapNoCash = computeFundamentals({
        trailingPE: 9,
        priceToBook: 0.9,
        profitMargins: 0.01,
        freeCashflow: -2e9,
        marketCap: 5e10,
        operatingCashflow: 1e8,
        netIncomeToCommon: 2e9,
        earningsGrowth: -0.15,
        revenueGrowth: -0.1,
    });
    assert.ok(
        quality.score > cheapNoCash.score,
        `quality ${quality.score} should beat cheap-no-cash ${cheapNoCash.score}`
    );
    assert.ok(quality.usedFields.includes('enterpriseToEbitda'));
    assert.equal(quality.usedFields.includes('trailingPE'), false);
    assert.ok(cheapNoCash.usedFields.includes('trailingPE'));
});

test('week52 is not a fundamental input', () => {
    const a = computeFundamentals({ trailingPE: 18, returnOnEquity: 0.15 });
    const b = computeFundamentals({ trailingPE: 18, returnOnEquity: 0.15 });
    assert.equal(a.score, b.score);
    assert.equal(a.usedFields.includes('week52Position'), false);
});
