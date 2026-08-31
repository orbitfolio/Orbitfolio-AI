import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ratelimit } from './lib/ratelimit';

function hasSupabaseEnv(): boolean {
    return Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
}

function isPublicApi(pathname: string): boolean {
    if (pathname.startsWith('/api/auth')) return true;
    if (pathname.startsWith('/api/search')) return true;
    if (pathname.startsWith('/api/quotes')) return true;
    if (pathname.startsWith('/api/analysis')) return true;
    if (pathname.startsWith('/api/test_json')) return true;
    return false;
}

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();

    // RATE LIMITING: Check before anything else (100 req/hour per IP)
    if (ratelimit) {
        try {
            const identifier =
                (req as NextRequest & { ip?: string }).ip ??
                req.headers.get('x-forwarded-for') ??
                'anonymous';
            const { success, limit, reset, remaining } = await ratelimit.limit(identifier);

            if (!success) {
                return new NextResponse(
                    JSON.stringify({
                        success: false,
                        message: `Too many requests. Try again in ${Math.ceil((reset - Date.now()) / 1000 / 60)} minutes.`,
                        retryAfter: new Date(reset).toISOString()
                    }),
                    {
                        status: 429,
                        headers: {
                            'content-type': 'application/json',
                            'X-RateLimit-Limit': limit.toString(),
                            'X-RateLimit-Remaining': remaining.toString(),
                            'X-RateLimit-Reset': new Date(reset).toISOString()
                        }
                    }
                );
            }
        } catch (error) {
            console.error('[Middleware] Rate limiting failed:', error);
        }
    }

    let session: { user?: { id?: string } } | null = null;
    if (hasSupabaseEnv()) {
        try {
            const supabase = createMiddlewareClient({ req, res });
            const result = await supabase.auth.getSession();
            session = result.data.session;
        } catch (error) {
            console.error('[Middleware] Supabase session check failed:', error);
        }
    }

    const pathname = req.nextUrl.pathname;
    const isHoldingsApi = pathname.startsWith('/api/holdings');
    const isAccountSettings = pathname.startsWith('/settings/account');

    // Demo app is usable without a session. Only holdings + optional account settings need auth.
    if (isHoldingsApi && !session) {
        return new NextResponse(
            JSON.stringify({ success: false, message: 'authentication failed' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
        );
    }

    if (isAccountSettings && !session) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    const publicMarket = isPublicApi(pathname);
    if (publicMarket) {
        res.headers.set("X-Orbitfolio-Mode", "public");
    }

    res.headers.set('Access-Control-Allow-Origin', req.headers.get('origin') || '*');
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.headers.set('Access-Control-Max-Age', '86400');

    return res;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except static assets, images, and the PWA manifest.
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
    ],
};
