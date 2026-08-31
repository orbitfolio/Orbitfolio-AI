import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mergeSuggestions, suggestFromCatalog } from '../lib/market/ticker-suggest';

test('rbc and royal both surface Royal Bank of Canada', () => {
    const rbc = suggestFromCatalog('rbc');
    const royal = suggestFromCatalog('royal');
    assert.ok(rbc.some((h) => h.symbol === 'RY.TO'));
    assert.ok(royal.some((h) => h.symbol === 'RY.TO' || h.symbol === 'RY'));
});

test('td and toronto both surface Toronto-Dominion Bank', () => {
    const td = suggestFromCatalog('td');
    const toronto = suggestFromCatalog('toronto');
    assert.ok(td.some((h) => h.symbol === 'TD.TO' || h.symbol === 'TD'));
    assert.ok(toronto.some((h) => /toronto-dominion/i.test(h.name)));
});

test('ITC ranks ITC Ltd, not a pile of unrelated names', () => {
    const local = suggestFromCatalog('ITC');
    assert.ok(local.some((h) => h.symbol === 'ITC.NS'));
    const junk = Array.from({ length: 40 }, (_, i) => ({
        symbol: `ZZ${i}`,
        name: `Random Co ${i}`,
        exchange: 'NYSE',
        quoteType: 'EQUITY',
        typeDisp: 'Equity',
    }));
    const merged = mergeSuggestions('ITC', local, junk, 12);
    assert.equal(merged[0].symbol, 'ITC.NS');
    assert.equal(merged.some((h) => h.symbol.startsWith('ZZ')), false);
    assert.ok(merged.length <= 12);
});

test('diam and diamond surface Diamond Power / cables', () => {
    const diam = suggestFromCatalog('diam');
    const diamond = suggestFromCatalog('diamond');
    const cable = suggestFromCatalog('diamond cable');
    assert.ok(diam.some((h) => h.symbol === 'DIACABS.NS'));
    assert.ok(diamond.some((h) => h.symbol === 'DIACABS.NS'));
    assert.ok(cable.some((h) => h.symbol === 'DIACABS.NS'));
});

test('enbr and enbridge surface Enbridge', () => {
    const enbr = suggestFromCatalog('enbr');
    const enb = suggestFromCatalog('enbridge');
    assert.ok(enbr.some((h) => h.symbol === 'ENB.TO' || h.symbol === 'ENB'));
    assert.ok(enb.some((h) => /enbridge/i.test(h.name)));
});

test('alias RBC ranks Royal Bank above a coincidental RBC ticker', () => {
    const merged = mergeSuggestions(
        'rbc',
        suggestFromCatalog('rbc'),
        [{ symbol: 'RBC', name: 'RBC Bearings', exchange: 'NYSE', quoteType: 'EQUITY', typeDisp: 'Equity' }],
        10
    );
    assert.equal(merged[0].symbol === 'RY.TO' || merged[0].symbol === 'RY', true);
    assert.ok(merged.some((h) => h.symbol === 'RBC'));
});

test('empty query returns nothing', () => {
    assert.deepEqual(suggestFromCatalog('  '), []);
});
