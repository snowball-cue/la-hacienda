'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signIn, type ActionResult } from '@/actions/auth'

interface LoginFormProps {
  redirectTo?: string
  resetSuccess?: boolean
}

const initialState: ActionResult | null = null

export default function LoginForm({ redirectTo, resetSuccess }: LoginFormProps) {
  const [state, action, isPending] = useActionState(signIn, initialState)

  return (
    <form action={action} className="space-y-5">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}

      {/* ── Reset-success banner (after completing /reset-password) ──── */}
      {resetSuccess && !state && (
        <div
          role="status"
          className="rounded-xl border border-moss-200 bg-moss-50 px-4 py-3 text-sm text-moss-600 flex items-start gap-2"
        >
          <svg className="h-4 w-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Password updated. Sign in with your new password.</span>
        </div>
      )}

      {/* ── Error banner ────────────────────────────────────────────── */}
      {state && !state.success && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 animate-fade-in"
        >
          {state.error}
        </div>
      )}

      {/* ── Email ───────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold text-stone-700 mb-1.5">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@example.com"
          className="input-lg"
        />
      </div>

      {/* ── Password ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="block text-sm font-semibold text-stone-700">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-terracotta hover:text-terracotta-dark transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="input-lg"
        />
      </div>

      {/* ── Submit ──────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full text-base py-3"
      >
        {isPending ? (
          <>
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Signing in…
          </>
        ) : (
          'Sign In'
        )}
      </button>
    </form>
  )
}
