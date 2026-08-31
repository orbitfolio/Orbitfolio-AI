import { NextResponse } from 'next/server';
import { analyzeSymbol } from '@/lib/market/analyze';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const symbol = (url.searchParams.get('symbol') ?? '').trim();
        if (!symbol) {
            return NextResponse.json(
                { success: false, message: 'symbol query required' },
                { status: 400 }
            );
        }
        const data = await analyzeSymbol(symbol);
        const meta = data.meta ?? { stale: false, source: 'live' };
        return NextResponse.json({ success: true, data, meta });
    } catch (error) {
        console.error('[API] GET /api/analysis', error);
        return NextResponse.json(
            { success: false, message: 'Analysis unavailable' },
            { status: 502 }
        );
    }
}
