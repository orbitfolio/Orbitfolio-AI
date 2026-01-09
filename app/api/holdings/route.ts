import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { HoldingSchema } from '@/lib/validations/schemas';

export async function POST(req: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });

        // Auth check (redundant but safe since middleware handles this)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return new NextResponse('Unauthorized', { status: 401 });

        const body = await req.json();

        // ZOD VALIDATION: Phase 13 Security Core
        const validation = HoldingSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                success: false,
                errors: validation.error.flatten().fieldErrors
            }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('holdings')
            .insert([{
                ...validation.data,
                user_id: session.user.id
            }])
            .select();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        // ✅ FIX: Generic error message, log details server-side
        console.error('[API Error] POST /api/holdings:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to create holding'
        }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const supabase = createRouteHandlerClient({ cookies });

        // ✅ FIX #1: Explicit auth check (defense in depth)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return new NextResponse(
                JSON.stringify({ success: false, message: 'Unauthorized' }),
                { status: 401, headers: { 'content-type': 'application/json' } }
            );
        }

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
            }, { status: 500 });
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
        });
    } catch (error: any) {
        console.error('[API Error] GET /api/holdings unexpected:', error);
        return NextResponse.json({
            success: false,
            message: 'Internal Server Error'
        }, { status: 500 });
    }
}

