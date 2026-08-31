import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    isFxSymbol,
    isStooqChallenge,
    looksLikeStooqCsv,
    parseStooqCsv,
    stooqCandidates,
    toStooqSymbol,
} from '../lib/market/stooq';

test('maps demo US/IN/CA symbols to Stooq tickers', () => {
    assert.equal(toStooqSymbol('AAPL'), 'aapl.us');
    assert.equal(toStooqSymbol('MSFT'), 'msft.us');
    assert.equal(toStooqSymbol('NVDA'), 'nvda.us');
    assert.deepEqual(stooqCandidates('RELIANCE.NS'), ['reliance.in', 'rel.in', 'reliance.ns']);
    assert.equal(toStooqSymbol('INFY.NS'), 'infy.in');
    assert.equal(toStooqSymbol('SHOP.TO'), 'shop.ca');
});

test('generic suffix mapping', () => {
    assert.deepEqual(stooqCandidates('TCS.NS'), ['tcs.in']);
    assert.deepEqual(stooqCandidates('SBIN.BO'), ['sbin.in']);
    assert.deepEqual(stooqCandidates('RY.TO'), ['ry.ca']);
    assert.deepEqual(stooqCandidates('ABC.V'), ['abc.ca']);
    assert.deepEqual(stooqCandidates('XYZ'), ['xyz.us']);
});

test('FX symbols are skipped', () => {
    assert.equal(isFxSymbol('INR=X'), true);
    assert.equal(isFxSymbol('CAD=X'), true);
    assert.deepEqual(stooqCandidates('INR=X'), []);
    assert.equal(toStooqSymbol('INR=X'), null);
});

test('parses Date,Open,High,Low,Close,Volume CSV', () => {
    const csv = [
        'Date,Open,High,Low,Close,Volume',
        '2024-01-02,100,110,90,105,1000',
        '2024-01-03,105,112,101,108,1100',
    ].join('\n');
    const bars = parseStooqCsv(csv);
    assert.equal(bars.length, 2);
    assert.equal(bars[0].open, 100);
    assert.equal(bars[0].high, 110);
    assert.equal(bars[0].low, 90);
    assert.equal(bars[0].close, 105);
    assert.equal(bars[0].volume, 1000);
    assert.equal(bars[1].close, 108);
    assert.ok(bars[0].time < bars[1].time);
});

test('detects JS challenge HTML and rejects it as CSV', () => {
    const html = '<!DOCTYPE html><html><script>challenge();</script></html>';
    assert.equal(isStooqChallenge(html), true);
    assert.equal(looksLikeStooqCsv(html), false);
    const csv = 'Date,Open,High,Low,Close,Volume\n2024-01-02,1,1,1,1,1\n';
    assert.equal(isStooqChallenge(csv), false);
    assert.equal(looksLikeStooqCsv(csv), true);
});
