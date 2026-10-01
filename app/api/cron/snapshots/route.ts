import { NextResponse } from 'next/server';
import { analyzeSymbol, mapLimit } from '@/lib/market/analyze';
import { normalizeSymbol } from '@/lib/market/yahoo';
import {
    isoWeekKey,
    mergeSnapshots,
    snapshotRunKey,
    weekKeys,
    type ScoreSnapshot,
} from '@/lib/market/snapshots';
import { cacheGet, cacheSet } from '@/lib/market/cache';
import { NO_STORE_HEADERS } from '@/lib/http/cache-headers';

export const maxDuration = 300;

/** One run per symbol per quote bucket; 6h so a retry can still refresh a broken week. */
const RUN_MARKER_TTL_SECONDS = 6 * 60 * 60;

/** Yahoo throttles aggressively; stay well under its burst ceiling. */
const CONCURRENCY = 2;

function universe(): string[] {
    return (process.env.SNAPSHOT_SYMBOLS ?? '')
        .split(',')
        .map(normalizeSymbol)
        .filter(Boolean);
}

function authorized(req: Request): boolean {
    const secret = process.env.CRON_SECRET;
    // Without a configured secret the route is closed, not open. An unauthenticated
    // write endpoint would let anyone burn the Yahoo quota we snapshot off.
    if (!secret) return false;
    const header = req.headers.get('authorization') ?? '';
    return header === `Bearer ${secret}`;
}

export async function POST(req: Request) {
    if (!authorized(req)) {
        return NextResponse.json(
            { success: false, message: 'unauthorized' },
            { status: 401, headers: NO_STORE_HEADERS }
        );
    }

    const symbols = universe();
    if (symbols.length === 0) {
        return NextResponse.json(
            { success: true, data: { week: isoWeekKey(), skipped: 0, saved: 0, note: 'SNAPSHOT_SYMBOLS is empty — nothing tracked yet.' } },
            { headers: NO_STORE_HEADERS }
        );
    }

    const runKey = snapshotRunKey();
    if (await cacheGet(runKey)) {
        return NextResponse.json(
            { success: true, data: { week: isoWeekKey(), skipped: symbols.length, saved: 0, note: 'Already snapshotted in this quote bucket.' } },
            { headers: NO_STORE_HEADERS }
        );
    }

    const failures: { symbol: string; message: string }[] = [];
    const saved: ScoreSnapshot[] = [];

    await mapLimit(symbols, CONCURRENCY, async (symbol) => {
        try {
            const view = await analyzeSymbol(symbol);
            saved.push({
                symbol: view.quote.symbol || symbol,
                score: view.analysis.orbitScore,
                action: view.analysis.guidance.action,
                price: view.quote.price ?? null,
                takenOn: '',
            });
        } catch (err) {
            failures.push({
                symbol,
                message: err instanceof Error ? err.message : 'analysis failed',
            });
        }
    });

    // Merge only what succeeded, so one dead symbol cannot void the whole week.
    if (saved.length > 0) {
        const all = await mergeSnapshots(saved);
        await cacheSet(runKey, { saved: saved.length }, RUN_MARKER_TTL_SECONDS);
        return NextResponse.json(
            {
                success: true,
                data: {
                    week: isoWeekKey(),
                    weeks: weekKeys(all).length,
                    saved: saved.length,
                    skipped: symbols.length - saved.length,
                    failures,
                },
            },
            { headers: NO_STORE_HEADERS }
        );
    }

    return NextResponse.json(
        { success: false, message: 'no symbols could be analyzed', data: { failures } },
        { status: 502, headers: NO_STORE_HEADERS }
    );
}

/** Vercel cron and manual probes both use GET. */
export const GET = POST;
