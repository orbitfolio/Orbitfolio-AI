import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    PILLAR_WEIGHTS,
    actionFromScore,
    combineRating,
    labelFromScore,
} from '../lib/market/rating';

test('labels map to widened guidance bands', () => {
    assert.equal(labelFromScore(9), 'Robust');
    assert.equal(labelFromScore(8), 'Robust');
    assert.equal(labelFromScore(7.5), 'Constructive');
    assert.equal(labelFromScore(6.5), 'Constructive');
    assert.equal(labelFromScore(6.2), 'Mixed');
    assert.equal(labelFromScore(5), 'Mixed');
    assert.equal(labelFromScore(4.9), 'Cautious');
    assert.equal(labelFromScore(3.5), 'Cautious');
    assert.equal(labelFromScore(3.2), 'Fragile');
    assert.equal(labelFromScore(1), 'Fragile');
});

test('actionFromScore maps Buy / Hold / Sell bands', () => {
    assert.equal(actionFromScore(10), 'Buy');
    assert.equal(actionFromScore(6.5), 'Buy');
    assert.equal(actionFromScore(6.4), 'Hold');
    assert.equal(actionFromScore(4), 'Hold');
    assert.equal(actionFromScore(3.9), 'Sell');
    assert.equal(actionFromScore(0), 'Sell');
});

test('combiner uses 35/35/30 when analyst data exists', () => {
    const result = combineRating({
        fundamental: 10,
        technical: 0,
        analystConsensus: 0,
    });
    assert.equal(result.weightsUsed.fundamental, PILLAR_WEIGHTS.fundamental);
    assert.equal(result.weightsUsed.technical, PILLAR_WEIGHTS.technical);
    assert.equal(result.weightsUsed.analystConsensus, PILLAR_WEIGHTS.analystConsensus);
    assert.equal(result.orbitScore, 3.5);
    assert.equal(result.label, 'Cautious');
    assert.equal(result.action, 'Sell');
    assert.equal(result.analystAvailable, true);
});

test('combiner renormalizes when analyst data is missing', () => {
    const result = combineRating({
        fundamental: 10,
        technical: 0,
        analystConsensus: null,
    });
    const expected = 10 * (0.35 / 0.7);
    assert.equal(result.weightsUsed.analystConsensus, 0);
    assert.equal(result.analystAvailable, false);
    assert.equal(result.pillars.analystConsensus, 5);
    assert.ok(Math.abs(result.weightsUsed.fundamental - 0.35 / 0.7) < 0.001);
    assert.ok(Math.abs(result.orbitScore - Math.round(expected * 10) / 10) < 0.05);
    assert.equal(result.action, actionFromScore(result.orbitScore));
});

test('all-high pillars are Robust Buy', () => {
    const result = combineRating({
        fundamental: 9,
        technical: 8.5,
        analystConsensus: 8,
    });
    assert.equal(result.label, 'Robust');
    assert.equal(result.action, 'Buy');
    assert.ok(result.orbitScore >= 8.0);
});

test('mid score 5.9 is Mixed Hold with transparent contributions', () => {
    const result = combineRating({
        fundamental: 7,
        technical: 5,
        analystConsensus: 5.5,
    });
    // 7*0.35 + 5*0.35 + 5.5*0.3 = 2.45 + 1.75 + 1.65 = 5.85 → 5.9
    const raw = 7 * 0.35 + 5 * 0.35 + 5.5 * 0.3;
    assert.equal(result.orbitScore, Math.round(raw * 10) / 10);
    assert.equal(result.orbitScore, 5.9);
    assert.equal(result.label, 'Mixed');
    assert.equal(result.action, 'Hold');
});
