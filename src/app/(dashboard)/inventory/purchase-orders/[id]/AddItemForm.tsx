'use client'

import { useState, useActionState } from 'react'
import { addOrderItem } from '@/actions/purchase-orders'
import type { POResult, POItemRow } from '@/actions/purchase-orders'

interface Props {
  orderId:  string
  products: Array<{ id: string; name: string; sku: string; unit: string; costPrice: string | null }>
}

export default function AddItemForm({ orderId, products }: Props) {
  const [open, setOpen] = useState(false)
  type AddItemAction = (prev: POResult<POItemRow> | null, fd: FormData) => Promise<POResult<POItemRow>>
  const action = addOrderItem.bind(null, orderId) as AddItemAction
  const [state, dispatch, isPending] = useActionState<POResult<POItemRow> | null, FormData>(action, null)

  if (state?.success && open) {
    // Close modal on success
    setTimeout(() => setOpen(false), 0)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs px-3 py-1.5">
        + Add Item
      </button>
    )
  }

  return (
    <form action={dispatch} className="flex items-end gap-2 flex-wrap">
      <div>
        <label className="label">Product</label>
        <select name="productId" required className="input text-xs h-8 py-0 w-52">
          <option value="" disabled>Select product…</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Qty</label>
        <input type="number" name="qtyOrdered" min="0.001" step="0.001" required placeholder="1" className="input text-xs h-8 py-0 w-20" />
      </div>
      <div>
        <label className="label">Unit Cost ($)</label>
        <input type="text" name="unitCost" placeholder="0.00" className="input text-xs h-8 py-0 w-24" />
      </div>
      {state && !state.success && <p className="text-xs text-red-600 w-full">{state.error}</p>}
      <div className="flex gap-1">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-xs py-1 px-2">Cancel</button>
        <button type="submit" disabled={isPending} className="btn-primary text-xs py-1 px-2">
          {isPending ? '…' : 'Add'}
        </button>
      </div>
    </form>
  )
}
