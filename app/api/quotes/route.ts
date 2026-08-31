import { NextResponse } from 'next/server';
import { getCachedQuotes } from '@/lib/market/analyze';

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
                { status: 400 }
            );
        }
        const data = await getCachedQuotes(symbols);
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('[API] GET /api/quotes', error);
        return NextResponse.json(
            { success: false, message: 'Quotes unavailable' },
            { status: 502 }
        );
    }
}
