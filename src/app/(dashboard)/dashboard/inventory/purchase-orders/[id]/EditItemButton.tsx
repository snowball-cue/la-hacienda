'use client'

import { useState, useTransition } from 'react'
import { updateOrderItem } from '@/actions/purchase-orders'
import type { POItemRow } from '@/actions/purchase-orders'

interface Props {
  item:          Pick<POItemRow, 'id' | 'qtyOrdered' | 'unitCost' | 'productName'>
  onItemUpdated: (item: POItemRow) => void
}

export default function EditItemButton({ item, onItemUpdated }: Props) {
  const [open,    setOpen]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await updateOrderItem(item.id, null, fd)
      if (result.success) {
        onItemUpdated(result.data)
        setOpen(false)
      } else {
        setError(result.error)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setError(null) }}
        className="text-xs text-stone-400 hover:text-terracotta underline underline-offset-2"
      >
        Edit
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        type="number"
        name="qtyOrdered"
        min="0.001"
        step="0.001"
        required
        defaultValue={item.qtyOrdered}
        placeholder="Qty"
        className="input text-xs h-7 py-0 w-16"
        title="Quantity ordered"
      />
      <input
        type="text"
        name="unitCost"
        defaultValue={item.unitCost ?? ''}
        placeholder="Cost"
        className="input text-xs h-7 py-0 w-20"
        title="Unit cost"
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-stone-400 hover:text-stone-600"
      >
        ✕
      </button>
      <button
        type="submit"
        disabled={isPending}
        className="text-xs text-terracotta hover:text-terracotta/80 font-medium"
      >
        {isPending ? '…' : 'Save'}
      </button>
    </form>
  )
}
