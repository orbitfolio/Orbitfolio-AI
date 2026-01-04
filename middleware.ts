import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
    const res = NextResponse.next()
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
