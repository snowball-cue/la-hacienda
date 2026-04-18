'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// ── Validation schemas ───────────────────────────────────────────────────────

const SignInSchema = z.object({
  email:    z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

// ── Action result types ──────────────────────────────────────────────────────

export type ActionResult =
  | { success: true }
  | { success: false; error: string }

// ── signIn ───────────────────────────────────────────────────────────────────

/**
 * Signs in a staff user with email + password via Supabase Auth.
 *
 * On success: redirects to /dashboard (or the `redirectTo` param if provided).
 * On failure: returns { success: false, error } so the form can display it.
 *
 * Security notes:
 *  - Never trust `redirectTo` for open redirect — validate it starts with '/'.
 *  - Input is Zod-validated before reaching Supabase.
 *  - Error messages are sanitized — never expose raw Supabase error details.
 */
export async function signIn(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    email:      formData.get('email'),
    password:   formData.get('password'),
    redirectTo: formData.get('redirectTo'),
  }

  // Validate input
  const parsed = SignInSchema.safeParse(raw)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'Invalid input.'
    return { success: false, error: firstError }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email:    parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Map Supabase error codes to user-friendly messages.
    // Do NOT expose the raw error.message — it can leak internal details.
    if (
      error.message.toLowerCase().includes('invalid login credentials') ||
      error.message.toLowerCase().includes('invalid email or password')
    ) {
      return { success: false, error: 'Incorrect email or password. Please try again.' }
    }

    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { success: false, error: 'Please verify your email address before signing in.' }
    }

    // Generic fallback — log server-side only (no console.log per CLAUDE.md rules)
    return { success: false, error: 'Sign-in failed. Please try again or contact support.' }
  }

  // Validate redirectTo to prevent open redirect attacks.
  // Only allow paths that start with '/' and don't start with '//' (protocol-relative).
  const redirectTo = typeof raw.redirectTo === 'string' && raw.redirectTo.startsWith('/')
    ? raw.redirectTo
    : '/dashboard'

  redirect(redirectTo)
}

// ── signOut ──────────────────────────────────────────────────────────────────

/**
 * Signs out the current user and redirects to /login.
 * Safe to call from any Server Action or Server Component.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
