import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    computeTechnicals,
    maxDrawdown,
    realizedVolatility,
    scoreRelMomentum,
    scoreVolatility,
    scoreDrawdown,
    scoreWeek52Range,
    week52RangePosition,
    windowReturn,
    TECH_WEIGHTS,
    type OhlcvBar,
} from '../lib/market/technicals';
import {
    betaRiskAdjustment,
    FUND_GROUP_WEIGHTS,
    computeFundamentals,
} from '../lib/market/fundamentals';
import { PILLAR_WEIGHTS, combineRating } from '../lib/market/rating';

const TECH_WEIGHTS_SUM = Object.values(TECH_WEIGHTS).reduce((a, b) => a + b, 0);

function barsFromCloses(closes: number[]): OhlcvBar[] {
    return closes.map((close, i) => ({
        time: i * 86400000,
        open: close,
        high: close * 1.005,
        low: close * 0.995,
        close,
        volume: 1000,
    }));
}

function rising(n: number, start = 100, step = 0.3): number[] {
    const out: number[] = [];
    let p = start;
    for (let i = 0; i < n; i++) {
        p += step + Math.sin(i / 9) * 0.08;
        out.push(p);
    }
    return out;
}

test('windowReturn measures the full window compounded return', () => {
    assert.equal(windowReturn([100, 200]), 1);
    assert.ok(Math.abs(windowReturn([100, 50, 200], 3)! - 1) < 1e-9);
    assert.equal(windowReturn([5]), null);
});

test('relative momentum rewards outperformance, not absolute gain', () => {
    // Gap = stock 12-1 minus market return. Bands match the absolute scorer:
    // >= 0.2 strong (8.5), >= 0.08 solid (7), >= 0 mid, negative-gap weak.
    assert.equal(scoreRelMomentum(0.25), 8.5); // +35% stock vs +10% market
    assert.equal(scoreRelMomentum(0.12), 7); // +22% stock vs +10% market
    assert.ok(scoreRelMomentum(0.02)! > 2.5);
    assert.ok(scoreRelMomentum(0.02)! < 7);
    assert.equal(scoreRelMomentum(-0.15), 2.5); // +5% stock vs +20% market
    assert.equal(scoreRelMomentum(null), null);
});

test('realized volatility is graded: calm series beats wild series at same gain', () => {
    const calm = rising(260, 100, 0.2);
    const wild = Array.from({ length: 260 }, (_, i) => 100 + 0.2 * i + 18 * Math.sin(i / 2.5));
    const calmVol = realizedVolatility(calm)!;
    const wildVol = realizedVolatility(wild)!;
    assert.ok(calmVol < 0.2, `calm ${calmVol}`);
    assert.ok(wildVol > 0.55, `wild ${wildVol}`);
    assert.ok(scoreVolatility(calmVol)! > scoreVolatility(wildVol)!);
    assert.ok(calmVol > 0);
    assert.ok(wildVol > 0);
});

test('max drawdown measures worst peak-to-trough and is graded', () => {
    const shock = [100, 110, 120, 90, 95, 100, 105, 110, 115, 120];
    const mdd = maxDrawdown(shock)!;
    assert.ok(Math.abs(mdd - (90 / 120 - 1)) < 1e-9);
    assert.ok(scoreDrawdown(mdd)! < 8);
    const steady = Array.from({ length: 60 }, (_, i) => 100 + i);
    assert.ok(scoreDrawdown(maxDrawdown(steady))! >= 8);
});

test('52-week range position spans 0..1 and is graded', () => {
    // 25 bars: flat 50s then a ramp to 150 (>= 22 bars required).
    const closes = [...Array(20).fill(50), 100, 120, 140, 150, 150];
    const bars = barsFromCloses(closes);
    const pos = week52RangePosition(bars)!;
    assert.ok(pos > 0.9, `expected near high, got ${pos}`);
    const atLow = week52RangePosition(barsFromCloses([...Array(24).fill(50), 40]))!;
    assert.ok(atLow < 0.05, `expected near low, got ${atLow}`);
    assert.ok(scoreWeek52Range(pos)! > scoreWeek52Range(atLow)!);
});

test('new technical weights sum to 1 and renormalize without a benchmark', () => {
    assert.ok(Math.abs(TECH_WEIGHTS_SUM - 1) < 1e-9, `weights sum ${TECH_WEIGHTS_SUM}`);
    const closes = rising(260);
    const withBench = computeTechnicals(barsFromCloses(closes), { benchmarkCloses: closes });
    const withoutBench = computeTechnicals(barsFromCloses(closes));
    assert.ok(Number.isFinite(withoutBench.score));
    // Missing benchmark drops relMomentum; weights renormalize rather than
    // collapse. Same series as its own benchmark => relMomentum = 0 => mid band.
    assert.ok(Math.abs(withBench.score - withoutBench.score) <= 0.5);
});

test('beta risk adjustment is capped within the plan band', () => {
    assert.equal(betaRiskAdjustment(1.7, 7), -0.6); // (1.1-1.7)*1.0
    assert.equal(betaRiskAdjustment(0.5, 7), 0.6); // (1.1-0.5)*1.0
    assert.equal(betaRiskAdjustment(3, 7), -1.25); // hard cap
    assert.equal(betaRiskAdjustment(null, 7), null);
    assert.equal(betaRiskAdjustment(0, 7), null);
    const CAP = 1.25;
    for (const beta of [0.2, 0.6, 1.1, 1.8, 2.5, 4]) {
        const adj = betaRiskAdjustment(beta, 7)!;
        assert.ok(Math.abs(adj) <= CAP + 1e-9, `beta ${beta} adj ${adj}`);
        assert.ok(Math.abs(adj) / 10 <= 0.15, 'adjustment stays under 15% of pillar');
    }
});

test('dividend sustainability bands and renormalization', () => {
    const base = {
        trailingPE: 25,
        priceToBook: 5,
        returnOnEquity: 0.2,
        operatingMargins: 0.2,
        marketCap: 1e11,
    };
    const sustainable = computeFundamentals({ ...base, payoutRatio: 0.3 });
    const risky = computeFundamentals({ ...base, payoutRatio: 0.9 });
    assert.ok(sustainable.score > risky.score, `sustainable ${sustainable.score} vs risky ${risky.score}`);
    assert.equal(sustainable.dividendSustainability, 0.3);
    assert.ok(sustainable.usedFields.includes('dividendSustainability'));
    const noData = computeFundamentals({ ...base });
    assert.equal(noData.dividendSustainability, null);
    assert.equal(noData.usedFields.includes('dividendSustainability'), false);
    assert.ok(Number.isFinite(noData.score));
});

test('group weights including dividends sum to 1 and pillar weights untouched', () => {
    const sum = Object.values(FUND_GROUP_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `fund group weights sum ${sum}`);
    assert.equal(FUND_GROUP_WEIGHTS.dividends, 0.03);
    assert.equal(PILLAR_WEIGHTS.technical, 0.35);
    assert.equal(PILLAR_WEIGHTS.fundamental, 0.35);
    assert.equal(PILLAR_WEIGHTS.analystConsensus, 0.3);
});

test('A3 completion: combineRating applies the capped beta adjustment in the pipeline', () => {
    const pillars = { technical: 7, fundamental: 6.9, analystConsensus: 5 };
    const noBeta = combineRating(pillars);
    assert.equal(noBeta.riskAdjustment, null);
    assert.equal(noBeta.orbitScore, 6.4); // exact pre-A3 combine

    const highBeta = combineRating(pillars, { beta: 1.7 });
    assert.equal(highBeta.riskAdjustment, -0.6);
    assert.equal(highBeta.pillars.technical, 7); // raw pillar preserved for UI
    // weighted: 0.35*6.4 + 0.35*6.9 + 0.3*5 = 6.165 -> 6.2
    assert.equal(highBeta.orbitScore, 6.2);

    const lowBeta = combineRating(pillars, { beta: 0.9 });
    assert.equal(lowBeta.riskAdjustment, 0.2);
    assert.equal(lowBeta.orbitScore, 6.4); // 0.35*7.2 + 0.35*6.9 + 0.3*5 = 6.435 -> 6.4

    // Cap: extreme beta never moves the pillar by more than 1.25
    for (const beta of [0.1, 2, 4]) {
        const r = combineRating(pillars, { beta });
        assert.ok(Math.abs(r.riskAdjustment!) <= 1.25 + 1e-9);
        assert.ok(Math.abs(r.riskAdjustment!) / 10 <= 0.15 + 1e-9, 'cap within 15% of pillar');
        assert.ok(r.orbitScore >= 0 && r.orbitScore <= 10);
    }
});


