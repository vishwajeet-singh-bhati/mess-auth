// middleware.ts
// ============================================================
// Route protection middleware
// Runs on every request before page rendering.
//
// Rules:
//   /kiosk/*         → Public (no auth — TV display pages)
//   /login           → Public (redirect to dashboard if authed)
//   /student/*       → Requires role: student
//   /staff/*         → Requires role: staff | admin
//   /admin/*         → Requires role: admin
//   /api/qr/generate → Public (kiosk fetches this without auth)
//   /api/auth/*      → Requires authenticated session
//   /api/admin/*     → Server verifies admin role internally
//   /api/staff/*     → Server verifies staff role internally
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { UserRole } from '@/types/database'

// ─── Route configuration ─────────────────────────────────────────────────────

/** Public routes — accessible without authentication */
const PUBLIC_ROUTES = [
  '/login',
  '/kiosk',              // kiosk display pages
  '/api/qr/generate',    // kiosk fetches QR without auth
]

/** Route prefix → required roles */
const PROTECTED_ROUTES: Array<{ prefix: string; roles: UserRole[] }> = [
  { prefix: '/admin',   roles: ['admin'] },
  { prefix: '/staff',   roles: ['staff', 'admin'] },
  { prefix: '/student', roles: ['student'] },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

function getRequiredRoles(pathname: string): UserRole[] | null {
  for (const route of PROTECTED_ROUTES) {
    if (pathname.startsWith(route.prefix)) return route.roles
  }
  return null
}

function redirectTo(url: string, req: NextRequest) {
  return NextResponse.redirect(new URL(url, req.url))
}

// ─── Role → default landing page ─────────────────────────────────────────────

const ROLE_HOME: Record<UserRole, string> = {
  student: '/student/dashboard',
  staff:   '/staff/dashboard',
  admin:   '/admin/dashboard',
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Skip static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Public routes — always allow
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Create a response to pass to Supabase SSR (for cookie handling)
  const response = NextResponse.next({
    request: { headers: req.headers },
  })

  // Build a Supabase client that reads cookies from the request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Get current session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Root path — redirect based on auth status
  if (pathname === '/') {
    if (!user) return redirectTo('/login', req)
    // Role is in user_metadata (set when user is created)
    const role = user.user_metadata?.role as UserRole | undefined
    return redirectTo(role ? (ROLE_HOME[role] ?? '/login') : '/login', req)
  }

  // API routes — let the route handler perform its own auth check
  // (We skip middleware auth for API to avoid double-checking)
  if (pathname.startsWith('/api')) {
    return response
  }

  // Page routes: not logged in → redirect to login
  if (!user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Page routes: check role
  const requiredRoles = getRequiredRoles(pathname)
  if (requiredRoles) {
    const role = user.user_metadata?.role as UserRole | undefined

    if (!role || !requiredRoles.includes(role)) {
      // Wrong role — redirect to their correct home
      const home = role ? (ROLE_HOME[role] ?? '/login') : '/login'
      return redirectTo(home, req)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
