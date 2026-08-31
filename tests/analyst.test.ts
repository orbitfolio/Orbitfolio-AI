import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseAverageAnalystRating, scoreAnalystConsensus } from '../lib/market/analyst';

test('parses Yahoo averageAnalystRating strings', () => {
    assert.deepEqual(parseAverageAnalystRating('1.8 - Buy'), { mean: 1.8, key: 'buy' });
    assert.equal(parseAverageAnalystRating('Strong Buy').key, 'strong_buy');
    assert.equal(parseAverageAnalystRating(null).mean, undefined);
});

test('key-only street rating is available (India-style, no trend table)', () => {
    const snap = scoreAnalystConsensus(null, { recommendationKey: 'buy', numberOfAnalystOpinions: 27 });
    assert.equal(snap.available, true);
    assert.ok(snap.score != null && snap.score >= 7);
    assert.equal(snap.recommendationKey, 'buy');
});

test('averageAnalystRating string scores when financialData mean is missing', () => {
    const snap = scoreAnalystConsensus([], { averageAnalystRating: '1.5 - Strong Buy' });
    assert.equal(snap.available, true);
    assert.equal(snap.recommendationKey, 'strong_buy');
    assert.ok(snap.score != null && snap.score >= 8);
});

test('empty trend without key stays unavailable', () => {
    const snap = scoreAnalystConsensus(null, {});
    assert.equal(snap.available, false);
    assert.equal(snap.score, null);
});
