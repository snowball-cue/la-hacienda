'use client'

import { useActionState } from 'react'
import { requestPasswordReset, type ActionResult } from '@/actions/auth'

const initialState: ActionResult | null = null

export default function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(requestPasswordReset, initialState)

  // On success, show a calm confirmation view instead of the form
  if (state?.success) {
    return (
      <div
        role="status"
        className="rounded-xl border border-moss-200 bg-moss-50 px-5 py-6 text-sm text-moss-600 animate-fade-in"
      >
        <div className="flex items-start gap-3">
          <svg className="h-5 w-5 mt-0.5 shrink-0 text-moss" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M2.003 5.884 10 9.882l7.997-3.998A2 2 0 0 0 16 4H4a2 2 0 0 0-1.997 1.884Z" />
            <path d="m18 8.118-8 4-8-4V14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.118Z" />
          </svg>
          <div>
            <p className="font-semibold text-moss-600 mb-1">Check your email</p>
            <p className="text-moss-600/80">{state.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-5">
      {state && !state.success && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

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
        <p className="text-xs text-stone-500 mt-2">
          We&apos;ll send a reset link to this address.
        </p>
      </div>

      <button type="submit" disabled={isPending} className="btn-primary w-full text-base py-3">
        {isPending ? 'Sending link…' : 'Send reset link'}
      </button>
    </form>
  )
}
