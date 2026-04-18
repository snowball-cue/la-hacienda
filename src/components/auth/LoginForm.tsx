'use client'

import { useActionState } from 'react'
import { signIn, type ActionResult } from '@/actions/auth'

interface LoginFormProps {
  redirectTo?: string
}

const initialState: ActionResult | null = null

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, action, isPending] = useActionState(signIn, initialState)

  return (
    <form action={action} className="space-y-5">
      {/* Hidden field so the Server Action can redirect back to the intended page */}
      {redirectTo && (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      )}

      {/* ── Error banner ────────────────────────────────────────────── */}
      {state && !state.success && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      {/* ── Email ───────────────────────────────────────────────────── */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-stone-700 mb-1.5"
        >
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
          className="w-full px-3 py-2.5 text-sm border border-stone-300 rounded-md shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
        />
      </div>

      {/* ── Password ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-stone-700"
          >
            Password
          </label>
          {/* Phase 4+: wire this to Supabase password reset flow */}
          <button
            type="button"
            className="text-xs text-terracotta hover:text-terracotta-dark transition-colors"
            onClick={() => alert('Password reset — coming soon. Contact your manager.')}
          >
            Forgot password?
          </button>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full px-3 py-2.5 text-sm border border-stone-300 rounded-md shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-terracotta focus:border-terracotta"
        />
      </div>

      {/* ── Submit ──────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary w-full justify-center py-2.5"
      >
        {isPending ? (
          <>
            <svg
              className="h-4 w-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
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
