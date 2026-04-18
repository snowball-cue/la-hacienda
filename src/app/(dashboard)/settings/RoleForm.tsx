'use client'

import { useActionState } from 'react'
import { changeUserRole } from '@/actions/settings'
import type { SettingsResult } from '@/actions/settings'

export default function RoleForm({
  userId,
  currentRole,
  isCurrentUser,
}: {
  userId: string
  currentRole: string
  isCurrentUser: boolean
}) {
  const action = changeUserRole.bind(null, userId)
  const [state, dispatch, isPending] = useActionState<SettingsResult | null, FormData>(action, null)

  if (isCurrentUser) {
    return (
      <span className="badge bg-gold/20 text-yellow-800 text-[10px] uppercase tracking-wide">
        You (owner)
      </span>
    )
  }

  return (
    <form action={dispatch} className="flex items-center gap-2">
      <select
        name="role"
        defaultValue={currentRole}
        disabled={isPending}
        className="input text-xs py-1 px-2 h-7"
      >
        <option value="staff">Staff</option>
        <option value="manager">Manager</option>
        <option value="owner">Owner</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="btn-secondary text-xs py-1 px-2 h-7"
      >
        {isPending ? '…' : 'Save'}
      </button>
      {state && !state.success && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
      {state?.success && (
        <span className="text-xs text-green-600">Saved</span>
      )}
    </form>
  )
}
