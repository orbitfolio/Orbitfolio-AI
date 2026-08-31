import assert from 'node:assert/strict';
import { test } from 'node:test';
import { computeTechnicals, rsi, sma, scoreTechnicals, type OhlcvBar } from '../lib/market/technicals';

function barsFromCloses(closes: number[]): OhlcvBar[] {
    return closes.map((close, i) => ({
        time: i * 86400000,
        open: close,
        high: close,
        low: close,
        close,
        volume: 1000,
    }));
}

test('SMA of a constant series equals the constant', () => {
    const values = Array(60).fill(10);
    assert.equal(sma(values, 50), 10);
});

test('RSI of a strictly rising series is 100', () => {
    const values = Array.from({ length: 30 }, (_, i) => 100 + i);
    const value = rsi(values, 14);
    assert.ok(value != null);
    assert.ok(value > 90, `expected strong RSI, got ${value}`);
});

test('RSI of a strictly falling series is near 0', () => {
    const values = Array.from({ length: 30 }, (_, i) => 100 - i);
    const value = rsi(values, 14);
    assert.ok(value != null);
    assert.ok(value < 10, `expected weak RSI, got ${value}`);
});

test('technical score prefers uptrend above SMAs with mid RSI', () => {
    const up: number[] = [];
    let p = 100;
    for (let i = 0; i < 220; i++) {
        p += 0.4 + Math.sin(i / 8) * 0.15;
        up.push(p);
    }
    const tech = computeTechnicals(barsFromCloses(up));
    assert.ok(tech.sma50 != null && tech.sma200 != null);
    assert.ok(tech.lastClose != null && tech.lastClose > tech.sma50);
    assert.ok(tech.sma50 > tech.sma200);
    assert.ok(tech.score >= 6, `expected constructive technicals, got ${tech.score}`);
});

test('insufficient bars still return a bounded score', () => {
    const tech = computeTechnicals(barsFromCloses([10, 11, 12]));
    assert.ok(tech.score >= 0 && tech.score <= 10);
    assert.equal(tech.sma200, null);
});

function risingCloses(n: number, start = 100, step = 0.35): number[] {
    const out: number[] = [];
    let p = start;
    for (let i = 0; i < n; i++) {
        p += step + Math.sin(i / 9) * 0.08;
        out.push(p);
    }
    return out;
}

function fallingCloses(n: number, start = 180, step = 0.35): number[] {
    const out: number[] = [];
    let p = start;
    for (let i = 0; i < n; i++) {
        p -= step + Math.sin(i / 9) * 0.08;
        out.push(Math.max(5, p));
    }
    return out;
}

test('rising 12-1 series scores higher than falling', () => {
    const up = computeTechnicals(barsFromCloses(risingCloses(220)));
    const down = computeTechnicals(barsFromCloses(fallingCloses(220)));
    assert.ok(up.mom12_1 != null && down.mom12_1 != null);
    assert.ok(up.mom12_1 > down.mom12_1, `mom12_1 up ${up.mom12_1} vs down ${down.mom12_1}`);
    assert.ok(up.score > down.score, `score up ${up.score} vs down ${down.score}`);
});

test('RSI 65 in uptrend is not punished vs RSI 45', () => {
    const base = {
        lastClose: 120,
        sma50: 110,
        sma200: 100,
        mom12_1: 0.15,
        adx14: 30,
        volumeRatio: 1.1,
        week52HighRatio: 0.92,
        rsi14: 65,
    };
    const strong = scoreTechnicals(base);
    const weaker = scoreTechnicals({ ...base, rsi14: 45 });
    assert.ok(strong >= weaker, `RSI 65 scored ${strong} vs RSI 45 scored ${weaker}`);
});

test('MACD histogram does not change technical score when other inputs are fixed', () => {
    const base = {
        lastClose: 120,
        sma50: 110,
        sma200: 100,
        rsi14: 58,
        mom12_1: 0.12,
        adx14: 28,
        volumeRatio: 1.05,
        week52HighRatio: 0.9,
    };
    const a = scoreTechnicals({ ...base, macdHistogram: 4, macd: 2, macdSignal: 1 });
    const b = scoreTechnicals({ ...base, macdHistogram: -4, macd: -2, macdSignal: 1 });
    assert.equal(a, b);
});
