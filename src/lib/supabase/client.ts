import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase Browser Client — src/lib/supabase/client.ts
 *
 * ── WHEN TO USE THIS ─────────────────────────────────────────────────────────
 *
 * Use this client ONLY inside Client Components (files with "use client").
 * It is designed for browser-based operations:
 *   - Reading public data that doesn't require elevated privileges
 *   - Subscribing to Realtime events (future feature)
 *   - Triggering client-side auth flows (e.g., OAuth redirects)
 *
 * ── WHEN NOT TO USE THIS ─────────────────────────────────────────────────────
 *
 * For any operation that:
 *   - Requires checking or writing to the database from the server
 *   - Needs the current user's session for authorization
 *   - Involves privileged data (cost prices, supplier contacts, etc.)
 *
 * → Use the SERVER client instead: src/lib/supabase/server.ts
 *
 * ── SECURITY ─────────────────────────────────────────────────────────────────
 *
 * This client uses the ANON key (NEXT_PUBLIC_SUPABASE_ANON_KEY), which is:
 *   ✓ Safe to expose in the browser (it's public knowledge)
 *   ✓ Scoped by Row Level Security (RLS) policies on every table
 *   ✗ NOT the service role key — it cannot bypass RLS
 *
 * All access through this client is governed by RLS policies.
 * An anon-key request can only read/write rows that the RLS policy allows
 * for the authenticated user (or the anonymous role).
 *
 * ── USAGE ────────────────────────────────────────────────────────────────────
 *
 *   'use client'
 *   import { createClient } from '@/lib/supabase/client'
 *
 *   function MyComponent() {
 *     const supabase = createClient()
 *     // supabase.from('products').select('*') etc.
 *   }
 *
 * Note: Call createClient() INSIDE the component or hook, not at module level,
 * so it picks up the latest session cookie on each render.
 */
export function createClient() {
  return createBrowserClient(
    // Public Supabase project URL — safe to expose to the browser
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Anon key — safe to expose; all access gated by RLS
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
