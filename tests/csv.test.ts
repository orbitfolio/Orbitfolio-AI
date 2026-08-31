import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inferMarketFromTicker, parseHoldingsCsv } from '../lib/holdings/csv';

test('parses ticker,quantity,cost_price,asset_type', () => {
    const csv = 'ticker,quantity,cost_price,asset_type\nAAPL,10,150.5,STOCK\n';
    const result = parseHoldingsCsv(csv);
    assert.equal(result.errors.length, 0);
    assert.equal(result.rows.length, 1);
    assert.deepEqual(result.rows[0], {
        ticker: 'AAPL',
        quantity: 10,
        cost_price: 150.5,
        asset_type: 'STOCK',
        market: 'US',
    });
});

test('accepts symbol,qty,avg aliases and optional asset_type', () => {
    const csv = 'symbol,qty,avg\nmsft,8,390\n';
    const result = parseHoldingsCsv(csv);
    assert.equal(result.errors.length, 0);
    assert.equal(result.rows[0].ticker, 'MSFT');
    assert.equal(result.rows[0].quantity, 8);
    assert.equal(result.rows[0].cost_price, 390);
    assert.equal(result.rows[0].asset_type, 'STOCK');
});

test('maps exchange suffixes to markets', () => {
    assert.equal(inferMarketFromTicker('RELIANCE.NS'), 'IN');
    assert.equal(inferMarketFromTicker('TCS.BO'), 'IN');
    assert.equal(inferMarketFromTicker('SHOP.TO'), 'CA');
    assert.equal(inferMarketFromTicker('WEED.V'), 'CA');
    assert.equal(inferMarketFromTicker('AAPL'), 'US');
    const csv = 'ticker,quantity,cost_price\nRELIANCE.NS,5,2500\nSHOP.TO,2,90\nAAPL,1,100\n';
    const result = parseHoldingsCsv(csv);
    assert.deepEqual(
        result.rows.map((r) => [r.ticker, r.market]),
        [
            ['RELIANCE.NS', 'IN'],
            ['SHOP.TO', 'CA'],
            ['AAPL', 'US'],
        ]
    );
});

test('skips bad rows and last-wins on duplicate ticker', () => {
    const csv = 'ticker,qty,avg\nAAPL,0,10\nAAPL,3,20\nBAD,,\n';
    const result = parseHoldingsCsv(csv);
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].quantity, 3);
    assert.equal(result.rows[0].cost_price, 20);
    assert.ok(result.errors.length >= 1);
});

test('empty csv reports an error', () => {
    const result = parseHoldingsCsv('   ');
    assert.equal(result.rows.length, 0);
    assert.ok(result.errors.length >= 1);
});
