'use client'

import { useState, useTransition } from 'react'
import { removeOrderItem } from '@/actions/purchase-orders'

interface Props {
  itemId:        string
  productName:   string
  onItemRemoved: () => void
}

export default function RemoveItemButton({ itemId, productName, onItemRemoved }: Props) {
  const [confirm,   setConfirm]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    setError(null)
    setConfirm(true)
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await removeOrderItem(itemId)
      if (result.success) {
        onItemRemoved()
      } else {
        setError(result.error)
        setConfirm(false)
      }
    })
  }

  if (confirm) {
    return (
      <span className="flex items-center gap-1 text-xs">
        {error && <span className="text-red-600">{error}</span>}
        <button
          onClick={handleConfirm}
          disabled={isPending}
          className="text-red-600 hover:text-red-800 font-medium"
        >
          {isPending ? '…' : 'Confirm'}
        </button>
        <span className="text-stone-300">·</span>
        <button
          onClick={() => setConfirm(false)}
          disabled={isPending}
          className="text-stone-400 hover:text-stone-600"
        >
          Keep
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={handleClick}
      title={`Remove ${productName}`}
      className="text-xs text-stone-300 hover:text-red-500 transition-colors"
    >
      Remove
    </button>
  )
}
