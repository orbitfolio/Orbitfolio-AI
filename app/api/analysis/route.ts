import { NextResponse } from 'next/server';
import { analyzeSymbol } from '@/lib/market/analyze';
import { NO_STORE_HEADERS, PUBLIC_CACHE_HEADERS } from '@/lib/http/cache-headers';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const symbol = (url.searchParams.get('symbol') ?? '').trim();
        if (!symbol) {
            return NextResponse.json(
                { success: false, message: 'symbol query required' },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }
        const data = await analyzeSymbol(symbol);
        const meta = data.meta ?? { stale: false, source: 'live' };
        return NextResponse.json({ success: true, data, meta }, { headers: PUBLIC_CACHE_HEADERS });
    } catch (error) {
        console.error('[API] GET /api/analysis', error);
        return NextResponse.json(
            { success: false, message: 'Analysis unavailable' },
            { status: 502, headers: NO_STORE_HEADERS }
        );
    }
}
