import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHoldingsJson, serializeHoldingsJson } from '../lib/holdings/json';

test('serialize then parse round-trips holdings', () => {
    const json = serializeHoldingsJson([
        {
            id: 'h1',
            symbol: 'AAPL',
            name: 'Apple Inc.',
            quantity: 10,
            averagePrice: 150,
            currency: 'USD',
            market: 'US',
            assetType: 'STOCK',
        },
    ]);
    const parsed = parseHoldingsJson(json);
    assert.equal(parsed.error, null);
    assert.equal(parsed.holdings.length, 1);
    assert.equal(parsed.holdings[0].symbol, 'AAPL');
    assert.equal(parsed.holdings[0].quantity, 10);
});

test('parseHoldingsJson accepts a raw array', () => {
    const parsed = parseHoldingsJson(
        JSON.stringify([{ symbol: 'RELIANCE.NS', quantity: 2, averagePrice: 2400 }])
    );
    assert.equal(parsed.error, null);
    assert.equal(parsed.holdings[0].market, 'IN');
    assert.equal(parsed.holdings[0].currency, 'INR');
});

test('parseHoldingsJson rejects empty or invalid payloads', () => {
    assert.ok(parseHoldingsJson('').error);
    assert.ok(parseHoldingsJson('{').error);
    assert.ok(parseHoldingsJson('{}').error);
    assert.ok(parseHoldingsJson('[]').error);
});
