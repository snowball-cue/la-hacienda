'use client'

import { useState, useActionState } from 'react'
import { markOrderShipped } from '@/actions/purchase-orders'
import type { POResult, PORow } from '@/actions/purchase-orders'

export default function MarkShippedForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false)
  type ShippedAction = (prev: POResult<PORow> | null, fd: FormData) => Promise<POResult<PORow>>
  const action = markOrderShipped.bind(null, orderId) as ShippedAction
  const [state, dispatch, isPending] = useActionState<POResult<PORow> | null, FormData>(action, null)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary text-sm">
        Mark as Shipped
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-base font-semibold text-stone-900">Mark as Shipped</h2>
        <form action={dispatch} className="space-y-4">
          <div>
            <label className="label">Tracking Reference (optional)</label>
            <input
              type="text"
              name="trackingRef"
              placeholder="e.g. 1Z999AA10123456784"
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">Expected Delivery Date (optional)</label>
            <input type="date" name="expectedAt" className="input w-full" />
          </div>
          {state && !state.success && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? 'Saving…' : 'Confirm Shipped'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
