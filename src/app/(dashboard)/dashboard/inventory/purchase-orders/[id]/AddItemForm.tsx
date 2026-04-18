'use client'

import { useState, useTransition } from 'react'
import { addOrderItem } from '@/actions/purchase-orders'
import type { POItemRow } from '@/actions/purchase-orders'

interface Props {
  orderId:     string
  products:    Array<{ id: string; name: string; sku: string; unit: string; costPrice: string | null }>
  onItemAdded: (item: POItemRow) => void
}

export default function AddItemForm({ orderId, products, onItemAdded }: Props) {
  const [open,    setOpen]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setOpen(true)
    setError(null)
  }

  function handleCancel() {
    setOpen(false)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await addOrderItem(orderId, null, fd)
      if (result.success) {
        onItemAdded(result.data)
        setOpen(false)
      } else {
        setError(result.error)
      }
    })
  }

  if (!open) {
    return (
      <button onClick={handleOpen} className="btn-secondary text-xs px-3 py-1.5">
        + Add Item
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap">
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
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
      <div className="flex gap-1">
        <button type="button" onClick={handleCancel} className="btn-secondary text-xs py-1 px-2">Cancel</button>
        <button type="submit" disabled={isPending} className="btn-primary text-xs py-1 px-2">
          {isPending ? '…' : 'Add'}
        </button>
      </div>
    </form>
  )
}
