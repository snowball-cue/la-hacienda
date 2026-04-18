'use client'

import { useTransition } from 'react'
import { approveTimeOffRequest, denyTimeOffRequest, cancelTimeOffRequest } from '@/actions/time-off'

export function ApproveButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await approveTimeOffRequest(id) })}
      className="text-xs text-emerald-700 hover:text-emerald-900 font-medium disabled:opacity-50"
    >
      {pending ? '…' : 'Approve'}
    </button>
  )
}

export function DenyButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await denyTimeOffRequest(id) })}
      className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
    >
      {pending ? '…' : 'Deny'}
    </button>
  )
}

export function CancelButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm('Cancel this request?')) return
        start(async () => { await cancelTimeOffRequest(id) })
      }}
      className="text-xs text-stone-400 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? '…' : 'Cancel'}
    </button>
  )
}
