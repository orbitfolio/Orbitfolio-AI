import { NextResponse } from 'next/server';
import { SearchQuerySchema } from '@/lib/validations/schemas';
import { searchYahoo } from '@/lib/market/yahoo';
import { mergeSuggestions, suggestFromCatalog } from '@/lib/market/ticker-suggest';

export async function GET(req: Request) {
    try {
        const url = new URL(req.url);
        const parsed = SearchQuerySchema.safeParse({
            q: url.searchParams.get('q') ?? '',
            limit: url.searchParams.get('limit')
                ? Number(url.searchParams.get('limit'))
                : 12,
        });
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, message: 'Invalid query', errors: parsed.error.flatten() },
                { status: 400 }
            );
        }
        const { q, limit } = parsed.data;
        const local = suggestFromCatalog(q, limit);
        const remote = await searchYahoo(q, limit);
        const results = mergeSuggestions(q, local, remote, limit);
        return NextResponse.json({ success: true, data: results });
    } catch (error) {
        console.error('[API] GET /api/search', error);
        const q = new URL(req.url).searchParams.get('q') ?? '';
        const local = suggestFromCatalog(q, 12);
        if (local.length) {
            return NextResponse.json({ success: true, data: local });
        }
        return NextResponse.json(
            { success: false, message: 'Search unavailable' },
            { status: 502 }
        );
    }
}
