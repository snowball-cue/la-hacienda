'use client'

import { useActionState } from 'react'
import { assignStore } from '@/actions/settings'
import type { SettingsResult } from '@/actions/settings'
import type { StoreOption } from '@/actions/inventory'

export default function StoreForm({
  userId,
  currentStoreId,
  stores,
  isCurrentUser,
}: {
  userId: string
  currentStoreId: string | null
  stores: StoreOption[]
  isCurrentUser: boolean
}) {
  const action = assignStore.bind(null, userId)
  const [state, dispatch, isPending] = useActionState<SettingsResult | null, FormData>(action, null)

  if (isCurrentUser) return null

  return (
    <form action={dispatch} className="flex items-center gap-2">
      <select
        name="storeId"
        defaultValue={currentStoreId ?? ''}
        disabled={isPending}
        className="input text-xs py-1 px-2 h-7 min-w-32"
      >
        <option value="">All stores</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
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
