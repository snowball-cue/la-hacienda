'use client'

import { useState, useActionState } from 'react'
import { markOrderReceived } from '@/actions/purchase-orders'
import type { POResult, PORow, POItemRow } from '@/actions/purchase-orders'

export default function ReceiveOrderForm({
  orderId,
  items,
}: {
  orderId: string
  items:   POItemRow[]
}) {
  const [open, setOpen] = useState(false)
  type ReceiveAction = (prev: POResult<PORow> | null, fd: FormData) => Promise<POResult<PORow>>
  const action = markOrderReceived.bind(null, orderId) as ReceiveAction
  const [state, dispatch, isPending] = useActionState<POResult<PORow> | null, FormData>(action, null)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary text-sm">
        Receive Order
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-stone-900">Receive Order</h2>
        <p className="text-xs text-stone-500">
          Enter the quantity actually received for each item. This creates stock ledger entries.
          Leave as-is if the full shipped quantity was received.
        </p>

        <form action={dispatch} className="space-y-4">
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 truncate">{item.productName}</p>
                  <p className="text-xs text-stone-400">
                    Ordered: {item.qtyOrdered} {item.unit}
                    {item.qtyShipped && ` · Shipped: ${item.qtyShipped}`}
                  </p>
                </div>
                <input
                  type="number"
                  name={`qtyReceived_${item.id}`}
                  defaultValue={item.qtyShipped ?? item.qtyOrdered}
                  min="0"
                  step="0.001"
                  required
                  className="input text-xs h-8 py-0 w-24 text-right"
                />
                <span className="text-xs text-stone-400 w-8">{item.unit}</span>
              </div>
            ))}
          </div>

          {state && !state.success && (
            <p className="text-sm text-red-600">{state.error}</p>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary flex-1">
              {isPending ? 'Receiving…' : 'Confirm Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
