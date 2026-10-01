/**
 * Weekly score snapshots (#2): persist each holding's Orbit score over time so
 * the engine's claims can eventually be checked against realized returns.
 *
 * Storage mirrors the market cache: Upstash Redis when configured, falling
 * back to a JSON file under data/cache/. Writes are idempotent per week —
 * re-running the cron within the same week merges, never duplicates.
 *
 * SCOPE NOTE: snapshots are passive history. Nothing here feeds the Orbit
 * score; nothing here is returned to the rating pipeline.
 */

import { cacheGet, cacheSet, quoteBucket } from './cache';

export interface ScoreSnapshot {
    /** Uppercase symbol, e.g. INFY.NS. */
    symbol: string;
    /** Orbit score 0–10 at snapshot time. */
    score: number;
    /** Mechanical action derived from the score. */
    action: string;
    /** Price at snapshot time, if a quote was available. */
    price: number | null;
    /** ISO date (YYYY-MM-DD) the snapshot was taken. */
    takenOn: string;
}

/** Weekly snapshot list keyed by ISO week, e.g. "2026-W40". */
export type SnapshotWeek = Record<string, ScoreSnapshot[]>;

/**
 * Persistence seam. Defaults to the shared market cache; tests inject a
 * stub so they neither hit Redis nor pollute data/cache/market/ on disk.
 */
export interface SnapshotStore {
    get(): Promise<SnapshotWeek | null>;
    set(value: SnapshotWeek, ttlSeconds: number): Promise<void>;
}

const SNAPSHOTS_KEY = 'score-snapshots:v1';

/** Five years of weekly rows is more than enough to backtest the score. */
export const SNAPSHOT_TTL_SECONDS = 5 * 365 * 24 * 60 * 60;

const defaultStore: SnapshotStore = {
    get: () => cacheGet<SnapshotWeek>(SNAPSHOTS_KEY),
    set: (value, ttlSeconds) => cacheSet(SNAPSHOTS_KEY, value, ttlSeconds),
};

/** Monday-based ISO week key, e.g. 2026-09-28 → "2026-W40". */
export function isoWeekKey(d = new Date()): string {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0
    date.setUTCDate(date.getUTCDate() - dayNum + 3); // nearest Thursday
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const fDayNum = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - fDayNum + 3);
    const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** YYYY-MM-DD in UTC. */
export function isoDate(d = new Date()): string {
    return d.toISOString().slice(0, 10);
}

export async function readSnapshots(store: SnapshotStore = defaultStore): Promise<SnapshotWeek> {
    const raw = await store.get();
    return raw && typeof raw === 'object' ? raw : {};
}

/**
 * Merge snapshots into the weekly store. Symbols already present in the same
 * week are overwritten (latest value wins); others are appended.
 */
export async function mergeSnapshots(
    entries: ScoreSnapshot[],
    store: SnapshotStore = defaultStore,
    now = new Date()
): Promise<SnapshotWeek> {
    const week = isoWeekKey(now);
    const all = await readSnapshots(store);
    const existing = new Map((all[week] ?? []).map((s) => [s.symbol, s]));
    for (const e of entries) {
        existing.set(e.symbol, {
            ...e,
            symbol: e.symbol.toUpperCase(),
            takenOn: isoDate(now),
        });
    }
    const next: SnapshotWeek = {
        ...all,
        [week]: [...existing.values()].sort((a, b) => a.symbol.localeCompare(b.symbol)),
    };
    await store.set(next, SNAPSHOT_TTL_SECONDS);
    return next;
}

/** All weekly keys, oldest first. */
export function weekKeys(all: SnapshotWeek): string[] {
    return Object.keys(all).sort();
}

/**
 * One symbol's history, oldest week first — the series a backtest would read.
 */
export function symbolHistory(all: SnapshotWeek, symbol: string): ScoreSnapshot[] {
    const want = symbol.toUpperCase();
    return weekKeys(all)
        .flatMap((week) => all[week] ?? [])
        .filter((s) => s.symbol === want);
}

/**
 * Quote bucket key with the week layered in, so a cron retry inside the same
 * quarter-hour is recognised as the same run rather than a second one.
 */
export function snapshotRunKey(now = new Date()): string {
    return `snapshots:run:${isoWeekKey(now)}:${quoteBucket(now.getTime())}`;
}
