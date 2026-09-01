import { NextResponse } from 'next/server';
import { getCachedQuotes } from '@/lib/market/analyze';
import { NO_STORE_HEADERS, PUBLIC_CACHE_HEADERS } from '@/lib/http/cache-headers';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const raw = url.searchParams.get('symbols') ?? '';
        const symbols = raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 30);
        if (symbols.length === 0) {
            return NextResponse.json(
                { success: false, message: 'symbols query required' },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }
        const data = await getCachedQuotes(symbols);
        return NextResponse.json({ success: true, data }, { headers: PUBLIC_CACHE_HEADERS });
    } catch (error) {
        console.error('[API] GET /api/quotes', error);
        return NextResponse.json(
            { success: false, message: 'Quotes unavailable' },
            { status: 502, headers: NO_STORE_HEADERS }
        );
    }
}
