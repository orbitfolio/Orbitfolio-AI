import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    applyStaleMark,
    chooseAnalysisFallback,
    OFFLINE_NOTE,
    STALE_NOTE,
    applyOfflineMark,
} from '../lib/market/fallback';
import { computeTechnicals } from '../lib/market/technicals';
import { getOfflineSeed, isDemoSymbol, scaleBarsToPrice } from '../lib/market/offline-seed';
import { staleAnalysisCacheKey } from '../lib/market/cache-keys';

test('empty Yahoo chart still returns provided stale analysis', () => {
    const stale = {
        analysis: {
            symbol: 'AAPL',
            orbitScore: 7.2,
            guidance: { rationale: 'Prior live score.' },
        },
    };
    const choice = chooseAnalysisFallback({
        hasLiveChart: false,
        stale,
        offline: null,
    });
    assert.equal(choice.kind, 'stale');
    if (choice.kind !== 'stale') throw new Error('expected stale');
    const marked = applyStaleMark(choice.view);
    assert.match(marked.analysis.guidance.rationale, new RegExp(STALE_NOTE));
    assert.equal(marked.meta?.stale, true);
    assert.equal(marked.meta?.source, 'cache');
});

test('live chart wins over stale and offline', () => {
    const choice = chooseAnalysisFallback({
        hasLiveChart: true,
        stale: { analysis: { guidance: { rationale: 'old' } } },
        offline: { analysis: { guidance: { rationale: 'seed' } } },
    });
    assert.equal(choice.kind, 'live');
});

test('offline seed is last resort after empty Yahoo and no stale', () => {
    const offline = {
        analysis: { guidance: { rationale: 'seeded technicals' } },
    };
    const choice = chooseAnalysisFallback({
        hasLiveChart: false,
        stale: null,
        offline,
    });
    assert.equal(choice.kind, 'offline');
    if (choice.kind !== 'offline') throw new Error('expected offline');
    const marked = applyOfflineMark(choice.view);
    assert.match(marked.analysis.guidance.rationale, new RegExp(OFFLINE_NOTE, 'i'));
    assert.equal(marked.meta?.source, 'offline');
});

test('no chart, no stale, no seed → nothing (would 502 only then)', () => {
    const choice = chooseAnalysisFallback({
        hasLiveChart: false,
        stale: null,
        offline: null,
    });
    assert.equal(choice.kind, 'none');
});

test('stale analysis cache key has no day bucket', () => {
    assert.equal(staleAnalysisCacheKey('aapl'), 'analysis-stale:w353532:AAPL');
    assert.equal(staleAnalysisCacheKey('RELIANCE.NS'), 'analysis-stale:w353532:RELIANCE.NS');
});

test('demo offline seeds produce enough bars for SMA200', () => {
    for (const sym of ['AAPL', 'MSFT', 'NVDA', 'RELIANCE.NS', 'INFY.NS', 'SHOP.TO']) {
        assert.equal(isDemoSymbol(sym), true);
        const seed = getOfflineSeed(sym);
        assert.ok(seed);
        assert.ok(seed.bars.length >= 200);
        assert.ok(seed.bars[seed.bars.length - 1].close > 0);
    }
    assert.equal(getOfflineSeed('NOTREAL'), null);
});

test('scaleBarsToPrice pins the last close', () => {
    const seed = getOfflineSeed('AAPL');
    assert.ok(seed);
    const scaled = scaleBarsToPrice(seed.bars, 400);
    assert.ok(Math.abs(scaled[scaled.length - 1].close - 400) < 1e-6);
});

test('offline seed profiles produce technical scores at least 2 points apart', () => {
    const scores: number[] = [];
    for (const sym of ['AAPL', 'MSFT', 'NVDA', 'RELIANCE.NS', 'INFY.NS', 'SHOP.TO']) {
        const seed = getOfflineSeed(sym);
        assert.ok(seed);
        scores.push(computeTechnicals(seed.bars).score);
    }
    const span = Math.max(...scores) - Math.min(...scores);
    assert.ok(span >= 2, `expected technical span >= 2, got ${span} from ${scores.join(', ')}`);
});
