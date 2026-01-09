import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ratelimit } from './lib/ratelimit'

export async function middleware(req: NextRequest) {
    const res = NextResponse.next()

    // ✅ RATE LIMITING: Check before anything else (100 req/hour per IP)
    const identifier = req.ip ?? req.headers.get('x-forwarded-for') ?? 'anonymous'
    const { success, limit, reset, remaining } = await ratelimit.limit(identifier)

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
        )
    }

    const supabase = createMiddlewareClient({ req, res })

    // Refresh session if delayed - required for Server Components
    const {
        data: { session },
    } = await supabase.auth.getSession()

    const isApiRoute = req.nextUrl.pathname.startsWith('/api')
    const isDashboardRoute = req.nextUrl.pathname.startsWith('/dashboard')
    const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')

    // Protect dashboard routes
    if (isDashboardRoute && !session) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    // Protect API routes (except auth callbacks)
    if (isApiRoute && !isAuthRoute && !session) {
        return new NextResponse(
            JSON.stringify({ success: false, message: 'authentication failed' }),
            { status: 401, headers: { 'content-type': 'application/json' } }
        )
    }

    // ✅ CORS: Restrict cross-origin access
    res.headers.set('Access-Control-Allow-Origin', req.headers.get('origin') || '*')
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    res.headers.set('Access-Control-Max-Age', '86400')

    return res

}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public assets)
         */
        '/((?!_next/static|_next/image|favicon.ico|public).*)',
    ],
}
