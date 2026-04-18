'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'

// ── Validation schemas ───────────────────────────────────────────────────────

const SignInSchema = z.object({
  email:    z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

const ResetRequestSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
})

const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters.')
                      .max(72, 'Password is too long.'),
  confirm:  z.string().min(1, 'Please confirm your password.'),
}).refine(d => d.password === d.confirm, {
  message: 'Passwords do not match.',
  path: ['confirm'],
})

// ── Action result types ──────────────────────────────────────────────────────

export type ActionResult =
  | { success: true; message?: string }
  | { success: false; error: string }

// ── signIn ───────────────────────────────────────────────────────────────────

export async function signIn(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    email:      formData.get('email'),
    password:   formData.get('password'),
    redirectTo: formData.get('redirectTo'),
  }

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
    if (
      error.message.toLowerCase().includes('invalid login credentials') ||
      error.message.toLowerCase().includes('invalid email or password')
    ) {
      return { success: false, error: 'Incorrect email or password. Please try again.' }
    }
    if (error.message.toLowerCase().includes('email not confirmed')) {
      return { success: false, error: 'Please verify your email address before signing in.' }
    }
    return { success: false, error: 'Sign-in failed. Please try again or contact support.' }
  }

  const redirectTo = typeof raw.redirectTo === 'string' && raw.redirectTo.startsWith('/')
    ? raw.redirectTo
    : '/dashboard'

  redirect(redirectTo)
}

// ── requestPasswordReset ─────────────────────────────────────────────────────

/**
 * Sends a password reset email via Supabase Auth.
 * Always returns success to avoid leaking which emails are registered
 * (prevents email enumeration attacks).
 */
export async function requestPasswordReset(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = { email: formData.get('email') }

  const parsed = ResetRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid email.' }
  }

  const supabase = await createClient()

  // Build the redirect URL that Supabase will embed in the reset email.
  // This MUST be a fully-qualified URL. We derive the origin from the request
  // headers so it works in both local dev and production without hardcoding.
  const hdrs = await headers()
  const proto = hdrs.get('x-forwarded-proto') ?? 'https'
  const host  = hdrs.get('x-forwarded-host') ?? hdrs.get('host') ?? 'localhost:3000'
  const redirectTo = `${proto}://${host}/reset-password`

  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo })

  // Intentionally return success even if the email doesn't exist —
  // prevents attackers from enumerating which accounts are registered.
  return {
    success: true,
    message: 'If an account exists with that email, a reset link has been sent. Check your inbox.',
  }
}

// ── resetPassword ────────────────────────────────────────────────────────────

/**
 * Updates the current user's password. The user must have arrived here
 * via a recovery link that set a valid recovery session.
 */
export async function resetPassword(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = {
    password: formData.get('password'),
    confirm:  formData.get('confirm'),
  }

  const parsed = ResetPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const supabase = await createClient()

  // The recovery link establishes a session on arrival; updateUser uses it.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    if (error.message.toLowerCase().includes('same_password') ||
        error.message.toLowerCase().includes('same as the old password')) {
      return { success: false, error: 'New password must be different from your current password.' }
    }
    if (error.message.toLowerCase().includes('session')) {
      return { success: false, error: 'Reset link expired. Please request a new one.' }
    }
    return { success: false, error: 'Could not update password. Please try again.' }
  }

  redirect('/login?reset=success')
}

// ── signOut ──────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
