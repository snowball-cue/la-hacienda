import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * Auth Utilities — src/lib/auth.ts
 *
 * Server-side helpers for reading the current user's identity and role.
 *
 * ── CRITICAL SECURITY RULES ───────────────────────────────────────────────────
 *
 * 1. ALWAYS use getAuthUser() on the SERVER (Server Components, Server Actions).
 *    Never trust role or user ID values sent from the client — they can be faked.
 *
 * 2. Role is ALWAYS resolved from the `profiles` table in the database,
 *    never from a cookie or client-provided value.
 *
 * 3. Use getUser() (not getSession()) to validate the session.
 *    getSession() reads from the cookie only — it does NOT verify the token
 *    with Supabase's servers. getUser() makes a network call that revalidates
 *    the token, making it more secure for auth-gated operations.
 *
 * ── ROLE HIERARCHY ────────────────────────────────────────────────────────────
 *
 *   owner   (3) — Full access: products, stock, reports, users, task board
 *   manager (2) — Products, stock adjustments, reports, task board
 *   staff   (1) — Receive goods and log stock adjustments only
 *
 * ── USAGE IN SERVER COMPONENTS ────────────────────────────────────────────────
 *
 *   import { getAuthUser, hasMinimumRole } from '@/lib/auth'
 *   import { redirect } from 'next/navigation'
 *
 *   export default async function ReportsPage() {
 *     const user = await getAuthUser()
 *     if (!user || !hasMinimumRole(user.role, 'manager')) {
 *       redirect('/dashboard')  // Staff cannot view reports
 *     }
 *     // ... render reports
 *   }
 *
 * ── USAGE IN SERVER ACTIONS ───────────────────────────────────────────────────
 *
 *   'use server'
 *   import { getAuthUser } from '@/lib/auth'
 *
 *   export async function createTask(formData: FormData) {
 *     const user = await getAuthUser()
 *     if (!user || user.role === 'staff') {
 *       return { success: false, error: 'Unauthorized' }
 *     }
 *     // Insert task with created_by: user.id
 *   }
 */

/**
 * The three user roles in La Hacienda's system.
 * Matches the `role` column in the `profiles` table (TEXT type in DB).
 *
 * Phase 2 will add this as a PostgreSQL ENUM — Prisma will enforce it.
 */
export type UserRole = 'owner' | 'manager' | 'staff'

/**
 * The authenticated user's identity and role, merged from:
 *   - Supabase Auth (id, email)
 *   - Our `profiles` table (role, full_name)
 *
 * This is the object passed around Server Components and Server Actions
 * to make auth decisions.
 */
export interface AuthUser {
  /** UUID from auth.users — use this as `performed_by` in ledger entries */
  id: string
  /** Email address from Supabase Auth */
  email: string
  /** Role from the `profiles` table — never from the client */
  role: UserRole
  /** Display name — shown in audit logs and the dashboard nav */
  fullName: string | null
  firstName:  string | null
  lastName:   string | null
  middleName: string | null
  /**
   * Explicit module allowlist for managers. Empty = no restrictions (all modules visible).
   * Owners always see everything regardless of this value.
   * Controlled by owners via the employee edit modal.
   */
  allowedModules: string[]
}

/**
 * Returns "Last, First M." display format given the three name parts.
 * Falls back gracefully when parts are missing.
 */
export function formatEmployeeName(
  lastName:   string | null | undefined,
  firstName:  string | null | undefined,
  middleName: string | null | undefined,
): string {
  const last  = lastName?.trim()  || ''
  const first = firstName?.trim() || ''
  const mid   = middleName?.trim() ? middleName.trim()[0].toUpperCase() + '.' : ''
  if (!last && !first) return 'Unknown'
  if (!first)  return last
  if (!last)   return first
  return mid ? `${last}, ${first} ${mid}` : `${last}, ${first}`
}

/**
 * Retrieves the currently authenticated user and their role.
 *
 * Wrapped in React's cache() so that calling getAuthUser() multiple times
 * during a single request (layout + page + server action) dedupes to
 * a single Supabase getUser() call and a single Prisma profile fetch.
 * This cuts round-trip latency from ~3× to 1× per page render.
 */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return null

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true, firstName: true, lastName: true, middleName: true, allowedModules: true },
  })

  if (!profile) return null

  return {
    id: user.id,
    email: user.email!,
    role:           profile.role as UserRole,
    firstName:      profile.firstName     ?? null,
    lastName:       profile.lastName      ?? null,
    middleName:     profile.middleName    ?? null,
    fullName:       formatEmployeeName(profile.lastName, profile.firstName, profile.middleName),
    allowedModules: profile.allowedModules ?? [],
  }
})

/**
 * Role hierarchy check — answers: "does this user meet the minimum requirement?"
 *
 * Examples:
 *   hasMinimumRole('owner',   'manager') → true  (owner outranks manager)
 *   hasMinimumRole('manager', 'manager') → true  (exactly meets requirement)
 *   hasMinimumRole('staff',   'manager') → false (staff is below manager)
 *   hasMinimumRole('staff',   'staff')   → true  (meets minimum)
 *
 * Usage:
 *   if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    owner:   3,
    manager: 2,
    staff:   1,
  }
  return hierarchy[userRole] >= hierarchy[requiredRole]
}

/**
 * Checks whether the given role is exactly the specified role.
 * Use hasMinimumRole() for "at least X" checks (more common).
 * Use isRole() only when you need an EXACT match (rare).
 *
 * Example: isRole(user.role, 'owner') — only owners, not managers
 */
export function isRole(userRole: UserRole, role: UserRole): boolean {
  return userRole === role
}

/**
 * Checks whether a user can access a specific module.
 *
 * Rules:
 *   - Owners always have access to all modules.
 *   - Staff are not subject to module restrictions (their access is already
 *     limited by minRole on each nav item).
 *   - Managers: if their allowedModules list is empty, no restrictions apply
 *     (backwards-compatible default). If the list has entries, the user must
 *     be in the list to access the module.
 *
 * Usage in page guards:
 *   if (!hasModuleAccess(user, 'payroll')) redirect('/dashboard')
 */
export function hasModuleAccess(user: AuthUser, module: string): boolean {
  if (user.role === 'owner') return true
  if (user.role === 'staff')  return true
  if (user.allowedModules.length === 0) return true
  return user.allowedModules.includes(module)
}
