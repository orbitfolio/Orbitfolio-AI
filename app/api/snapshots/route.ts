import { NextResponse } from 'next/server';
import { readSnapshots, symbolHistory, weekKeys, isoWeekKey } from '@/lib/market/snapshots';
import { normalizeSymbol } from '@/lib/market/yahoo';
import { NO_STORE_HEADERS, PUBLIC_CACHE_HEADERS } from '@/lib/http/cache-headers';

/**
 * Read side of the weekly snapshot history. No symbol → a week overview so the
 * app can show "we have N weeks of record"; symbol → that symbol's series,
 * oldest first, which is the shape a backtest consumes.
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const raw = (url.searchParams.get('symbol') ?? '').trim();
        const all = await readSnapshots();
        const weeks = weekKeys(all);

        if (!raw) {
            return NextResponse.json(
                {
                    success: true,
                    data: {
                        currentWeek: isoWeekKey(),
                        weeks,
                        symbols: [...new Set(weeks.flatMap((w) => all[w].map((s) => s.symbol)))].sort(),
                        total: weeks.reduce((n, w) => n + all[w].length, 0),
                    },
                },
                { headers: PUBLIC_CACHE_HEADERS }
            );
        }

        const symbol = normalizeSymbol(raw);
        if (symbol.length > 20) {
            return NextResponse.json(
                { success: false, message: 'symbol too long' },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }

        const series = symbolHistory(all, symbol);
        return NextResponse.json(
            { success: true, data: { symbol, count: series.length, series } },
            { headers: PUBLIC_CACHE_HEADERS }
        );
    } catch (err) {
        console.error('[api/snapshots] failed', err);
        return NextResponse.json(
            { success: false, message: 'snapshot history unavailable' },
            { status: 502, headers: NO_STORE_HEADERS }
        );
    }
}
