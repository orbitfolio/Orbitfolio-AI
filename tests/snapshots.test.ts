import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    isoWeekKey,
    isoDate,
    mergeSnapshots,
    readSnapshots,
    weekKeys,
    symbolHistory,
    snapshotRunKey,
    SNAPSHOT_TTL_SECONDS,
    type ScoreSnapshot,
    type SnapshotStore,
    type SnapshotWeek,
} from '../lib/market/snapshots';

/**
 * In-memory store: tests must never touch Redis or write to
 * data/cache/market/, otherwise runs leak state into each other.
 */
function memoryStore(seed?: SnapshotWeek): SnapshotStore & { written: number } {
    const state = { value: seed ?? null, writes: 0 };
    return {
        get written() {
            return state.writes;
        },
        async get() {
            return state.value;
        },
        async set(value) {
            state.value = value;
            state.writes += 1;
        },
    };
}

test('isoWeekKey produces Monday-based ISO weeks', () => {
    // 2026-09-28 is a Monday; ISO week 40 of 2026.
    assert.equal(isoWeekKey(new Date('2026-09-28T12:00:00Z')), '2026-W40');
    assert.equal(isoWeekKey(new Date('2026-09-30T12:00:00Z')), '2026-W40');
    assert.equal(isoWeekKey(new Date('2026-10-04T12:00:00Z')), '2026-W40');
    // Week boundary: Monday 2026-10-05 starts W41.
    assert.equal(isoWeekKey(new Date('2026-10-05T12:00:00Z')), '2026-W41');
    // Year boundary: 2027-01-01 belongs to ISO week 53 of 2026.
    assert.equal(isoWeekKey(new Date('2027-01-01T12:00:00Z')), '2026-W53');
    // Known ISO edge: 2021-01-01 is in week 53 of 2020.
    assert.equal(isoWeekKey(new Date('2021-01-01T12:00:00Z')), '2020-W53');
});

test('isoDate is UTC YYYY-MM-DD', () => {
    assert.equal(isoDate(new Date('2026-09-30T23:30:00Z')), '2026-09-30');
    assert.equal(isoDate(new Date('2026-01-01T00:00:00Z')), '2026-01-01');
});

test('mergeSnapshots upserts per symbol within a week and sorts output', async () => {
    const store = memoryStore();
    const at = new Date('2026-10-01T09:00:00Z');
    const a: ScoreSnapshot = { symbol: 'MSFT', score: 6.1, action: 'Hold', price: 428.5, takenOn: '' };
    const b: ScoreSnapshot = { symbol: 'aapl', score: 7.2, action: 'Buy', price: 316.85, takenOn: '' };

    const first = await mergeSnapshots([a, b], store, at);
    const week = weekKeys(first).at(-1)!;
    assert.equal(week, '2026-W40');
    const syms = first[week].map((s) => s.symbol);
    assert.deepEqual(syms, ['AAPL', 'MSFT']); // normalized + sorted
    assert.equal(first[week].find((s) => s.symbol === 'AAPL')!.score, 7.2);

    // Same-week rerun: updated score for MSFT, no duplicate row, AAPL survives.
    const updated = await mergeSnapshots(
        [{ symbol: 'MSFT', score: 6.4, action: 'Buy', price: 430.1, takenOn: '' }],
        store,
        at
    );
    const msft = updated[week].filter((s) => s.symbol === 'MSFT');
    assert.equal(msft.length, 1);
    assert.equal(msft[0].score, 6.4);
    assert.ok(updated[week].some((s) => s.symbol === 'AAPL'));
    // takenOn is stamped by the merge, not trusted from the caller.
    assert.ok(updated[week].every((s) => s.takenOn === '2026-10-01'));
});

test('mergeSnapshots keeps prior weeks and writes a new week', async () => {
    const store = memoryStore();
    await mergeSnapshots(
        [{ symbol: 'INFY.NS', score: 5, action: 'Hold', price: 1480, takenOn: '' }],
        store,
        new Date('2026-09-30T09:00:00Z')
    );
    const next = await mergeSnapshots(
        [{ symbol: 'INFY.NS', score: 5.5, action: 'Hold', price: 1495, takenOn: '' }],
        store,
        new Date('2026-10-07T09:00:00Z')
    );

    assert.deepEqual(weekKeys(next), ['2026-W40', '2026-W41']);
    assert.equal(next['2026-W40'][0].price, 1480); // untouched
    assert.equal(next['2026-W41'][0].price, 1495);
    // One write per merge call.
    assert.equal(store.written, 2);
});

test('mergeSnapshots writes a five-year TTL', async () => {
    let ttl = 0;
    const store: SnapshotStore = {
        get: async () => null,
        set: async (_v, ttlSeconds) => {
            ttl = ttlSeconds;
        },
    };
    await mergeSnapshots(
        [{ symbol: 'AAPL', score: 7, action: 'Hold', price: 1, takenOn: '' }],
        store,
        new Date('2026-10-01T00:00:00Z')
    );
    assert.equal(ttl, SNAPSHOT_TTL_SECONDS);
    assert.ok(ttl > 4 * 365 * 24 * 3600);
});

test('symbolHistory returns one series oldest-first and is case-insensitive', async () => {
    const store = memoryStore();
    const aapl = (score: number, price: number): ScoreSnapshot => ({
        symbol: 'AAPL',
        score,
        action: 'Hold',
        price,
        takenOn: '',
    });
    const msft: ScoreSnapshot = { symbol: 'MSFT', score: 5, action: 'Hold', price: 400, takenOn: '' };
    await mergeSnapshots([aapl(6, 300)], store, new Date('2026-09-30T09:00:00Z'));
    await mergeSnapshots([msft], store, new Date('2026-09-30T09:00:00Z'));
    await mergeSnapshots([aapl(7, 310)], store, new Date('2026-10-07T09:00:00Z'));

    const all = await readSnapshots(store);
    const series = symbolHistory(all, 'aapl');
    assert.deepEqual(
        series.map((s) => s.score),
        [6, 7]
    );
    assert.deepEqual(
        series.map((s) => s.price),
        [300, 310]
    );
    // MSFT must not leak into AAPL's series.
    assert.ok(series.every((s) => s.symbol === 'AAPL'));
});

test('readSnapshots on a cold store returns an empty object', async () => {
    assert.deepEqual(await readSnapshots(memoryStore()), {});
    // A store that hands back garbage must not poison the shape.
    const junk = await readSnapshots({ get: async () => 'nope' as never, set: async () => {} });
    assert.deepEqual(junk, {});
});

test('run key is stable within a quote bucket and carries the ISO week', () => {
    const monday = new Date('2026-10-05T09:00:00Z');
    const k1 = snapshotRunKey(monday);
    const sameBucket = snapshotRunKey(new Date('2026-10-05T09:14:59Z'));
    const nextBucket = snapshotRunKey(new Date('2026-10-05T09:15:00Z'));
    assert.equal(k1, sameBucket);
    assert.notEqual(k1, nextBucket);
    assert.equal(k1, 'snapshots:run:2026-W41:2026-10-05T09:00Z');
    assert.match(k1, /^snapshots:run:\d{4}-W\d{2}:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}Z$/);
});
