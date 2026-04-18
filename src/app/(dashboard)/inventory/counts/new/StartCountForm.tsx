'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { startInventoryCount } from '@/actions/inventory-count'
import type { CountResult } from '@/actions/inventory-count'

interface Props {
  stores: { id: string; name: string }[]
}

export default function StartCountForm({ stores }: Props) {
  const router = useRouter()
  const [state, dispatch, isPending] = useActionState<CountResult | null, FormData>(
    startInventoryCount,
    null,
  )

  useEffect(() => {
    if (state?.success && 'id' in (state.data as object)) {
      const data = state.data as { id: string }
      router.push(`/dashboard/inventory/counts/${data.id}`)
    }
  }, [state, router])

  const err = !state?.success ? state?.error : null

  return (
    <form action={dispatch} className="card p-6 space-y-5">
      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>
      )}

      <div>
        <label className="label">Store <span className="text-red-500">*</span></label>
        {stores.length === 0 ? (
          <p className="text-sm text-stone-400">No stores found. Add stores in Settings first.</p>
        ) : (
          <select name="storeId" required className="input w-full">
            <option value="">Select store…</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          name="notes"
          rows={2}
          placeholder="e.g. Monthly stocktake — closing time"
          className="input w-full resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isPending || stores.length === 0} className="btn-primary">
          {isPending ? 'Creating…' : 'Start Count'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  )
}
