import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatQuoteAge, formatPct } from '../lib/format';

test('formatQuoteAge labels quote freshness honestly', () => {
    assert.equal(formatQuoteAge(30_000), 'just now');
    assert.equal(formatQuoteAge(4 * 60_000), '4 min ago');
    assert.equal(formatQuoteAge(59 * 60_000), '59 min ago');
    assert.equal(formatQuoteAge(60 * 60_000), '1h ago');
    assert.equal(formatQuoteAge(3 * 3_600_000), '3h ago');
    assert.equal(formatQuoteAge(2 * 86_400_000), '2d ago');
    assert.equal(formatQuoteAge(21 * 86_400_000), '3w ago');
});

test('formatQuoteAge rejects missing or invalid ages', () => {
    assert.equal(formatQuoteAge(null), '');
    assert.equal(formatQuoteAge(undefined), '');
    assert.equal(formatQuoteAge(NaN), '');
    assert.equal(formatQuoteAge(-5), '');
});

test('formatPct keeps its sign convention', () => {
    assert.equal(formatPct(24.444), '+24.44%');
    assert.equal(formatPct(-0.5), '-0.50%');
    assert.equal(formatPct(0), '0.00%');
});
