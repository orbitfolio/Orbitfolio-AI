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

/** A0: EV/EBITDA derived from enterpriseValue / ebitda when Yahoo omits the ratio. */
const DERIVABLE = { returnOnEquity: 0.12, priceToBook: 2, trailingPE: 40 };

test('EV/EBITDA is derived from enterpriseValue / ebitda when the ratio is missing', () => {
    const s = computeFundamentals({ ...DERIVABLE, enterpriseValue: 12e9, ebitda: 1.2e9 });
    assert.equal(s.enterpriseToEbitda, 10);
    assert.equal(s.evEbitdaSource, 'derived');
    assert.ok(s.usedFields.includes('enterpriseToEbitda'));
    // EV/EBITDA (10x) beats the trailing P/E (40x) it replaced.
    assert.ok(s.groupScores.value != null && s.groupScores.value > 6);
});

test('a reported EV/EBITDA always wins over the derived one', () => {
    const s = computeFundamentals({
        ...DERIVABLE,
        enterpriseToEbitda: 6,
        enterpriseValue: 12e9,
        ebitda: 1.2e9, // would derive to 10x
    });
    assert.equal(s.enterpriseToEbitda, 6);
    assert.equal(s.evEbitdaSource, 'yahoo');
});

test('a non-positive reported ratio still falls through to the derived one', () => {
    const s = computeFundamentals({
        ...DERIVABLE,
        enterpriseToEbitda: -1,
        enterpriseValue: 12e9,
        ebitda: 1.2e9,
    });
    assert.equal(s.enterpriseToEbitda, 10);
    assert.equal(s.evEbitdaSource, 'derived');
});

test('absurd or unusable components are refused rather than scored', () => {
    const missing = computeFundamentals({ ...DERIVABLE });
    assert.equal(missing.enterpriseToEbitda, null);
    assert.equal(missing.evEbitdaSource, null);

    // Negative EBITDA / negative enterprise value produce ratios with no meaning.
    const negativeEbitda = computeFundamentals({ ...DERIVABLE, enterpriseValue: 12e9, ebitda: -1e9 });
    assert.equal(negativeEbitda.enterpriseToEbitda, null);
    assert.equal(negativeEbitda.evEbitdaSource, null);

    const negativeEv = computeFundamentals({ ...DERIVABLE, enterpriseValue: -12e9, ebitda: 1.2e9 });
    assert.equal(negativeEv.enterpriseToEbitda, null);

    // 1000e9 / 1e6 = 1,000,000x is a unit fault, not a valuation.
    const absurd = computeFundamentals({ ...DERIVABLE, enterpriseValue: 1000e9, ebitda: 1e6 });
    assert.equal(absurd.enterpriseToEbitda, null);
    assert.equal(absurd.evEbitdaSource, null);

    // One missing component is not enough.
    assert.equal(computeFundamentals({ ...DERIVABLE, enterpriseValue: 12e9 }).enterpriseToEbitda, null);
});

test('the derived multiple is what actually moves the value pillar', () => {
    const withoutComponents = computeFundamentals(DERIVABLE);
    const withComponents = computeFundamentals({ ...DERIVABLE, enterpriseValue: 12e9, ebitda: 1.2e9 });
    assert.ok(
        withComponents.groupScores.value! > withoutComponents.groupScores.value!,
        'deriving EV/EBITDA should replace the expensive trailing P/E'
    );
    assert.notEqual(withComponents.score, withoutComponents.score);
});
