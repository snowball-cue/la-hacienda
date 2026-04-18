'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { removeOrderItem } from '@/actions/purchase-orders'

export default function RemoveItemButton({
  itemId,
  productName,
}: {
  itemId:      string
  productName: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (!confirm(`Remove "${productName}" from this order?`)) return
    startTransition(async () => {
      const result = await removeOrderItem(itemId)
      if (result.success) router.refresh()
      else alert(result.error)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-red-500 hover:text-red-700"
    >
      Remove
    </button>
  )
}
