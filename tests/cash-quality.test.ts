import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeFundamentals } from '../lib/market/fundamentals';
import { PILLAR_WEIGHTS, actionFromScore, combineRating } from '../lib/market/rating';

const RICH = {
    trailingPE: 30,
    priceToBook: 10,
    returnOnEquity: 0.3,
    operatingMargins: 0.3,
    freeCashflow: 90e9,
    marketCap: 3e12,
    operatingCashflow: 100e9,
    netIncomeToCommon: 80e9,
    earningsGrowth: 0.1,
};

test('cash conversion is graded: stronger conversion scores higher', () => {
    const strong = computeFundamentals({ ...RICH, operatingCashflow: 120e9, netIncomeToCommon: 80e9 }); // cc 1.5
    const mid = computeFundamentals({ ...RICH, operatingCashflow: 88e9, netIncomeToCommon: 80e9 }); // cc 1.1
    const weak = computeFundamentals({ ...RICH, operatingCashflow: 40e9, netIncomeToCommon: 80e9 }); // cc 0.5
    assert.ok(strong.score > mid.score, `strong ${strong.score} > mid ${mid.score}`);
    assert.ok(mid.score > weak.score, `mid ${mid.score} > weak ${weak.score}`);
    assert.equal(strong.cashConversion, 1.5);
    assert.equal(weak.cashConversion, 0.5);
    assert.ok(strong.usedFields.includes('cashConversion'));
});

test('negative cash conversion (profit while cash burns) scores at the floor', () => {
    const snap = computeFundamentals({ ...RICH, operatingCashflow: -10e9, netIncomeToCommon: 80e9 });
    assert.equal(snap.cashConversion, -0.12); // -0.125, JS Math.round is half-up
    assert.ok(snap.usedFields.includes('cashConversion'));
    // Cash group must reflect the floor via the conversion component.
    assert.ok((snap.groupScores.cash ?? 10) < 5, `cash group ${snap.groupScores.cash}`);
});

test('fcf conversion is graded and gates on positive operating cash flow', () => {
    const high = computeFundamentals({ ...RICH }); // fcf/ocf = 0.9
    const mid = computeFundamentals({ ...RICH, freeCashflow: 50e9 }); // 0.5
    const burning = computeFundamentals({ ...RICH, freeCashflow: -20e9 }); // negative
    assert.ok(high.score > mid.score, `high ${high.score} > mid ${mid.score}`);
    assert.ok(mid.score > burning.score, `mid ${mid.score} > burning ${burning.score}`);
    assert.equal(high.fcfConversion, 0.9);
    assert.equal(burning.fcfConversion, -0.2);
});

test('fcf conversion is skipped when operating cash flow is not positive', () => {
    const snap = computeFundamentals({ ...RICH, operatingCashflow: -5e9, freeCashflow: -8e9, netIncomeToCommon: 10e9 });
    assert.equal(snap.fcfConversion, null);
    assert.equal(snap.usedFields.includes('fcfConversion'), false);
});

test('accruals covers loss-makers: cash-positive losses are not punished like cash-burning ones', () => {
    const cashPositiveLoss = computeFundamentals({
        ...RICH,
        netIncomeToCommon: -2e9,
        operatingCashflow: 1.5e9,
    });
    const cashBurningLoss = computeFundamentals({
        ...RICH,
        netIncomeToCommon: -2e9,
        operatingCashflow: -5e9,
    });
    assert.ok(
        cashPositiveLoss.score > cashBurningLoss.score,
        `cash-positive ${cashPositiveLoss.score} > cash-burning ${cashBurningLoss.score}`
    );
    assert.ok(cashPositiveLoss.accrualsCheck != null);
    // Scaled accruals for (-2, 1.5) is (NI-OCF)/mean(|NI|,|OCF|) = -1, clamped display -1.
    assert.ok(cashPositiveLoss.accrualsCheck! < 0);
});

test('accruals not computed when both flows are zero (scale guard)', () => {
    const snap = computeFundamentals({ ...RICH, netIncomeToCommon: 0, operatingCashflow: 0 });
    assert.equal(snap.accrualsCheck, null);
    assert.equal(snap.usedFields.includes('accruals'), false);
});

test('missing cash flow data renormalizes: cashConversion unused, fcfYield still scored', () => {
    const noFlows = computeFundamentals({
        trailingPE: 30,
        priceToBook: 10,
        returnOnEquity: 0.3,
        operatingMargins: 0.3,
        marketCap: 3e12,
        freeCashflow: 90e9, // fcfYield computable
        earningsGrowth: 0.1,
    });
    assert.equal(noFlows.cashConversion, null);
    assert.equal(noFlows.accrualsCheck, null);
    assert.equal(noFlows.fcfConversion, null);
    assert.ok(noFlows.usedFields.includes('fcfYield'));
    assert.equal(noFlows.usedFields.includes('cashConversion'), false);
    assert.ok(Number.isFinite(noFlows.score));
});

test('cash-quality inputs change the fundamentals pillar score deterministically', () => {
    const strong = computeFundamentals({ ...RICH, operatingCashflow: 120e9 });
    const weak = computeFundamentals({ ...RICH, operatingCashflow: 40e9 });
    assert.equal(strong.score, computeFundamentals({ ...RICH, operatingCashflow: 120e9 }).score);
    assert.ok(strong.score > weak.score);
});

test('pillar weights and score bands are unchanged by the cash-quality work', () => {
    assert.equal(PILLAR_WEIGHTS.technical, 0.35);
    assert.equal(PILLAR_WEIGHTS.fundamental, 0.35);
    assert.equal(PILLAR_WEIGHTS.analystConsensus, 0.3);
    assert.equal(actionFromScore(6.5), 'Buy');
    assert.equal(actionFromScore(4), 'Hold');
    assert.equal(actionFromScore(3.9), 'Sell');
    const combined = combineRating({ technical: 7, fundamental: 6.9, analystConsensus: 5 });
    assert.equal(combined.orbitScore, 6.4); // 0.35*7 + 0.35*6.9 + 0.3*5 = 6.365 -> 6.4
});
