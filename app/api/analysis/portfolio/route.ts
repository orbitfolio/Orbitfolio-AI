import { NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzePortfolio } from '@/lib/market/analyze';
import { NO_STORE_HEADERS, PUBLIC_CACHE_HEADERS } from '@/lib/http/cache-headers';

const BodySchema = z.object({
    symbols: z.array(z.string().min(1)).min(1).max(30),
});

export async function POST(req: Request) {
    try {
        const json = await req.json();
        const parsed = BodySchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Invalid body', errors: parsed.error.flatten() },
                { status: 400, headers: NO_STORE_HEADERS }
            );
        }
        const data = await analyzePortfolio(parsed.data.symbols);
        return NextResponse.json({ success: true, data }, { headers: PUBLIC_CACHE_HEADERS });
    } catch (error) {
        console.error('[API] POST /api/analysis/portfolio', error);
        return NextResponse.json(
            { success: false, message: 'Portfolio analysis unavailable' },
            { status: 502, headers: NO_STORE_HEADERS }
        );
    }
}
