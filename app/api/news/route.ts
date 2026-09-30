import { NextResponse } from 'next/server';
import { fetchNewsForSymbol } from '@/lib/market/news';
import { normalizeSymbol } from '@/lib/market/yahoo';
import { NO_STORE_HEADERS, PUBLIC_CACHE_HEADERS } from '@/lib/http/cache-headers';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const symbol = normalizeSymbol(url.searchParams.get('symbol') ?? '');
        if (!symbol || symbol.length > 20) {
            return NextResponse.json(
                { success: false, message: 'symbol query required' },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }
        const news = await fetchNewsForSymbol(symbol);
        return NextResponse.json(
            { success: true, data: { symbol, news, note: 'Context only — headlines never feed the Orbit score.' } },
            { headers: PUBLIC_CACHE_HEADERS }
        );
    } catch (err) {
        console.error('[api/news] failed', err);
        return NextResponse.json(
            { success: false, message: 'news unavailable' },
            { status: 502, headers: NO_STORE_HEADERS }
        );
    }
}
