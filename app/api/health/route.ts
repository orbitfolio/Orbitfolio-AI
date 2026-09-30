import { NextResponse } from 'next/server';
import { NO_STORE_HEADERS } from '@/lib/http/cache-headers';

export async function GET() {
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
}
