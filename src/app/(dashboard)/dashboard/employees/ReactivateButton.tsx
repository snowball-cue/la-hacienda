'use client'

import { useTransition } from 'react'
import { reactivateEmployee } from '@/actions/employees'

export default function ReactivateButton({ id }: { id: string }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(async () => { await reactivateEmployee(id) })}
      className="text-xs text-emerald-700 hover:text-emerald-900 font-medium disabled:opacity-50"
    >
      {pending ? '…' : 'Reactivate'}
    </button>
  )
}
