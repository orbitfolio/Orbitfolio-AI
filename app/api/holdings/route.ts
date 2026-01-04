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
        return NextResponse.json({
            success: false,
            message: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
}

export async function GET(req: Request) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data, error } = await supabase.from('holdings').select('*');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
}
