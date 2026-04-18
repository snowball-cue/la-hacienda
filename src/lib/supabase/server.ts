import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase Server Client — src/lib/supabase/server.ts
 *
 * WHEN TO USE THIS
 * ─────────────────
 * Use this client inside Server Components, Server Actions,
 * and API Route Handlers. It reads the current user's session
 * from HTTP cookies — no localStorage, no client-side storage.
 *
 * Do NOT use this in Client Components ("use client" files).
 * For Client Components, use src/lib/supabase/client.ts instead.
 *
 * HOW IT WORKS
 * ─────────────
 * Supabase sessions are stored as HTTP cookies by @supabase/ssr.
 * This server client reads those cookies to authenticate the user and
 * automatically refreshes the session token when it is close to expiring.
 *
 * The cookies() function from next/headers is asynchronous in Next.js 15
 * — that is why we await it below.
 *
 * SESSION REFRESH
 * ───────────────
 * The setAll cookie handler updates response cookies when @supabase/ssr
 * refreshes a near-expiring session. If this is called from a Server
 * Component (where headers are read-only after rendering starts), the
 * try/catch safely ignores the error. The middleware.ts file handles
 * session refreshing BEFORE the request reaches the Server Component,
 * so the session is always up-to-date.
 *
 * SECURITY
 * ─────────
 * This client uses the ANON key but runs on the server. The user's
 * session cookie elevates their permissions from "anon" to "authenticated"
 * in Supabase RLS policies.
 *
 * For ADMIN operations that must bypass RLS, create a separate admin
 * client using SUPABASE_SERVICE_ROLE_KEY. Never expose the service
 * role key to the browser or use it in Client Components.
 *
 * USAGE EXAMPLES
 * ──────────────
 * In a Server Component:
 *
 *   import { createClient } from '@/lib/supabase/server'
 *
 *   export default async function InventoryPage() {
 *     const supabase = await createClient()
 *     const { data } = await supabase.from('products').select('*')
 *     return <ProductList products={data} />
 *   }
 *
 * In a Server Action:
 *
 *   'use server'
 *   import { createClient } from '@/lib/supabase/server'
 *
 *   export async function adjustStock(formData: FormData) {
 *     const supabase = await createClient()
 *     const { data: { user } } = await supabase.auth.getUser()
 *     // user.id is the authenticated user — use this as performed_by
 *   }
 */
export async function createClient() {
  // cookies() must be awaited in Next.js 15.
  // Returns the ReadonlyRequestCookies store for the current request.
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        /**
         * Read all cookies from the incoming request.
         * @supabase/ssr calls this to find and decode the session token.
         */
        getAll() {
          return cookieStore.getAll()
        },

        /**
         * Write updated session cookies to the response.
         * Called when @supabase/ssr refreshes a near-expiring session token.
         *
         * CookieOptions is exported from @supabase/ssr — it is Partial<CookieSerializeOptions>
         * from the 'cookie' package, which is structurally compatible with Next.js
         * ResponseCookie (domain, expires, httpOnly, maxAge, path, sameSite, secure).
         *
         * The try/catch is intentional:
         * In Server Components, the cookie store is read-only after rendering begins.
         * The middleware.ts handles session refreshing at the request level before
         * Server Components run, so no session data is lost.
         */
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // options is Partial<CookieSerializeOptions> — compatible with Next.js set()
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]),
            )
          } catch {
            // Safe to ignore — see comment above.
          }
        },
      },
    },
  )
}
