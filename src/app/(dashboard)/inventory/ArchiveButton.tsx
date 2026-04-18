'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { archiveProduct } from '@/actions/inventory'

export default function ArchiveButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (!confirm(`Archive "${name}"? It will no longer appear in inventory.`)) return
    startTransition(async () => {
      await archiveProduct(id)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-stone-400 hover:text-red-600 disabled:opacity-50"
    >
      {isPending ? 'Archiving…' : 'Archive'}
    </button>
  )
}
