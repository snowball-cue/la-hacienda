'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPurchaseOrder } from '@/actions/purchase-orders'
import type { POResult, PORow } from '@/actions/purchase-orders'

export default function NewPOForm({
  suppliers,
}: {
  suppliers: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  type CreateAction = (prev: POResult<PORow> | null, fd: FormData) => Promise<POResult<PORow>>
  const [state, dispatch, isPending] = useActionState<POResult<PORow> | null, FormData>(
    createPurchaseOrder as CreateAction, null,
  )

  useEffect(() => {
    if (state?.success) {
      router.push(`/dashboard/inventory/purchase-orders/${state.data.id}`)
    }
  }, [state, router])

  return (
    <form action={dispatch} className="card p-6 space-y-4">
      <div>
        <label className="label">Supplier *</label>
        <select name="supplierId" required className="input w-full">
          <option value="" disabled>Select supplier…</option>
          {suppliers.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {suppliers.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            No suppliers yet. <a href="/dashboard/suppliers" className="underline">Add one first</a>.
          </p>
        )}
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Any special instructions for this order…"
          className="input w-full resize-none"
        />
      </div>

      {state && !state.success && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button type="submit" disabled={isPending || suppliers.length === 0} className="btn-primary">
          {isPending ? 'Creating…' : 'Create Order'}
        </button>
      </div>
    </form>
  )
}
