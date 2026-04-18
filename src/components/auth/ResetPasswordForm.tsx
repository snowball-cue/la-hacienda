'use client'

import { useActionState } from 'react'
import { resetPassword, type ActionResult } from '@/actions/auth'

const initialState: ActionResult | null = null

export default function ResetPasswordForm() {
  const [state, action, isPending] = useActionState(resetPassword, initialState)

  return (
    <form action={action} className="space-y-5">
      {state && !state.success && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="block text-sm font-semibold text-stone-700 mb-1.5">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          autoFocus
          minLength={8}
          placeholder="At least 8 characters"
          className="input-lg"
        />
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-semibold text-stone-700 mb-1.5">
          Confirm new password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          minLength={8}
          placeholder="Repeat the password above"
          className="input-lg"
        />
      </div>

      <button type="submit" disabled={isPending} className="btn-primary w-full text-base py-3">
        {isPending ? 'Updating password…' : 'Update password'}
      </button>
    </form>
  )
}
