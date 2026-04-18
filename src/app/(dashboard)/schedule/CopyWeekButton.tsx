'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { copyWeek } from '@/actions/schedule'

export default function CopyWeekButton({
  fromWeekStart,
  toWeekStart,
}: {
  fromWeekStart: string
  toWeekStart:   string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    if (!confirm('Copy all shifts from last week to this week?')) return
    startTransition(async () => {
      const result = await copyWeek(fromWeekStart, toWeekStart)
      if (result.success) {
        router.refresh()
      } else {
        alert(result.error)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="btn-secondary text-xs px-3 py-1.5"
    >
      {isPending ? 'Copying…' : 'Copy last week'}
    </button>
  )
}
