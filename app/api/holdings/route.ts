import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { HoldingSchema } from '@/lib/validations/schemas';
import { PRIVATE_NO_STORE_HEADERS } from '@/lib/http/cache-headers';

function hasSupabaseEnv(): boolean {
    return Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
}

function unauthorized() {
    return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401, headers: PRIVATE_NO_STORE_HEADERS }
    );
}

export async function POST(req: Request) {
    try {
        if (!hasSupabaseEnv()) return unauthorized();

        const supabase = createRouteHandlerClient({ cookies });

        // Auth check in the handler (not only middleware).
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return unauthorized();

        const body = await req.json();

        // ZOD VALIDATION: Phase 13 Security Core
        const validation = HoldingSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                success: false,
                errors: validation.error.flatten().fieldErrors
            }, { status: 400, headers: PRIVATE_NO_STORE_HEADERS });
        }

        const { data, error } = await supabase
            .from('holdings')
            .insert([{
                ...validation.data,
                user_id: session.user.id
            }])
            .select();

        if (error) throw error;

        return NextResponse.json({ success: true, data }, { headers: PRIVATE_NO_STORE_HEADERS });
    } catch (error: unknown) {
        console.error('[API Error] POST /api/holdings:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to create holding'
        }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    }
}

export async function GET(req: Request) {
    try {
        if (!hasSupabaseEnv()) return unauthorized();

        const supabase = createRouteHandlerClient({ cookies });

        // Explicit auth check in the handler (defense in depth).
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return unauthorized();

        // ✅ FIX #3: Parse pagination params with validation
        const url = new URL(req.url);
        const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '50')));
        const offset = (page - 1) * limit;

        // User-specific query with pagination
        const { data, error, count } = await supabase
            .from('holdings')
            .select('*', { count: 'exact' })
            .eq('user_id', session.user.id) // Explicit user filtering
            .range(offset, offset + limit - 1);

        if (error) {
            // ✅ FIX #2: Log full error server-side, return generic message to client
            console.error('[API Error] GET /api/holdings:', error);
            return NextResponse.json({
                success: false,
                message: 'Failed to fetch holdings'
            }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
        }

        return NextResponse.json({
            success: true,
            data,
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            }
        }, { headers: PRIVATE_NO_STORE_HEADERS });
    } catch (error: unknown) {
        console.error('[API Error] GET /api/holdings unexpected:', error);
        return NextResponse.json({
            success: false,
            message: 'Internal Server Error'
        }, { status: 500, headers: PRIVATE_NO_STORE_HEADERS });
    }
}

