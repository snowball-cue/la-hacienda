import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js Middleware — src/middleware.ts
 *
 * WHAT THIS FILE DOES
 * ────────────────────
 * This middleware runs on every request matching the config.matcher pattern.
 * It has two responsibilities:
 *
 * 1. SESSION REFRESH
 *    Supabase sessions are stored as HTTP cookies with an expiry time.
 *    @supabase/ssr requires the session to be refreshed on every server
 *    request to prevent unexpected logouts during normal store operations.
 *    The getUser() call below triggers this refresh automatically.
 *
 *    Do NOT remove the getUser() call — without it, sessions expire and
 *    staff are logged out mid-shift, which is disruptive in a store setting.
 *
 * 2. ROUTE PROTECTION
 *    Unauthenticated users are redirected from /dashboard/** to /login.
 *    Already-authenticated users visiting /login are sent to /dashboard.
 *    The intended destination is preserved in a `redirectTo` query param
 *    so the user lands on the right page after logging in.
 *
 * WHAT THIS FILE DOES NOT DO
 * ──────────────────────────
 * This middleware does NOT enforce role-based access (e.g., blocking Staff
 * from /dashboard/tasks). Role checks happen inside each page or Server
 * Action, where the user's role is fetched from the database via
 * getAuthUser() in src/lib/auth.ts.
 *
 * Reason: checking roles in middleware requires an extra DB round-trip on
 * every request. Server-side role checks in the page are more reliable and
 * keep middleware fast.
 *
 * HOW SUPABASE SSR COOKIE HANDLING WORKS
 * ────────────────────────────────────────
 * When the session is refreshed, @supabase/ssr needs to update cookies on
 * both the incoming Request (for downstream middleware) and the outgoing
 * Response (for the browser). The pattern below handles both correctly.
 */
export async function middleware(request: NextRequest) {
  // Start with a pass-through response. We may modify it (add cookies)
  // or replace it (redirect) based on the auth check below.
  let supabaseResponse = NextResponse.next({ request })

  // Create a Supabase client that reads and writes cookies via the
  // middleware's request/response pair. Fresh on every request (stateless).
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read all cookies from the incoming request.
        // @supabase/ssr uses these to find and decode the session token.
        getAll() {
          return request.cookies.getAll()
        },

        // Write updated cookies to both the request and the response.
        // Why both? The request update ensures downstream middleware sees
        // the refreshed token in the same request cycle. The response
        // update ensures the browser saves the new session cookie.
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Update the request cookies (affects current request's context)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          // Create a fresh response with the updated request headers
          supabaseResponse = NextResponse.next({ request })
          // Also write to the response so the browser saves the new cookie
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              // Cast: CookieOptions (Partial<CookieSerializeOptions>) is structurally
              // compatible with Next.js ResponseCookie (same serialization properties).
              options as Parameters<typeof supabaseResponse.cookies.set>[2],
            ),
          )
        },
      },
    },
  )

  // IMPORTANT: Do not add logic between createServerClient() and getUser().
  // getUser() validates the session token with Supabase's auth servers and
  // triggers the session refresh. Any early return above this would skip
  // the refresh and cause premature session expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Route Protection: /dashboard/**
  // Any path under /dashboard requires an authenticated session.
  // Preserve the intended destination in `redirectTo` for post-login redirect.
  // Example: /dashboard/inventory → /login?redirectTo=/dashboard/inventory
  if (pathname.startsWith('/dashboard') && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Route Protection: /login
  // Note: we intentionally do NOT redirect authenticated users from /login to
  // /dashboard here. If a user has a Supabase session but no profile row
  // (e.g. after a database reset), the layout would redirect them back to /login,
  // creating an infinite loop. Let the login page render so they can sign out
  // or reach /setup to create their profile.

  // For all other routes: return the response with any refreshed session cookies.
  return supabaseResponse
}

/**
 * Middleware matcher — controls which requests this runs on.
 *
 * Runs on ALL paths EXCEPT:
 *   _next/static  — compiled JS/CSS assets
 *   _next/image   — image optimization service
 *   favicon.ico, sitemap.xml, robots.txt — static metadata files
 *
 * This ensures the session is refreshed on every real page request
 * without adding overhead to static asset delivery.
 */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
