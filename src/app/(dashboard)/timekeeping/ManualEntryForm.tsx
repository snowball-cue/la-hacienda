'use client'

import { useActionState, useEffect, useState } from 'react'
import { addManualTimeEntry } from '@/actions/time-entries'
import type { TimeResult } from '@/actions/time-entries'

interface Props {
  stores:    { id: string; name: string }[]
  employees: { id: string; displayName: string; storeId: string | null }[]
}

export default function ManualEntryForm({ stores, employees }: Props) {
  const [open, setOpen] = useState(false)
  const [state, dispatch, isPending] = useActionState<TimeResult | null, FormData>(
    addManualTimeEntry,
    null,
  )

  useEffect(() => {
    if (state?.success) {
      setOpen(false)
      window.location.reload()
    }
  }, [state])

  const err = !state?.success ? state?.error : null

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm">
        + Add Manual Entry
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-900">Add Manual Time Entry</h2>
            <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
          </div>
          <form action={dispatch} className="px-5 py-4 space-y-4">
            {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}

            <div>
              <label className="label text-xs">Employee <span className="text-red-500">*</span></label>
              <select name="profileId" required className="input w-full text-sm">
                <option value="">Select employee…</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.displayName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Store <span className="text-red-500">*</span></label>
              <select name="storeId" required className="input w-full text-sm">
                <option value="">Select store…</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label text-xs">Clock In <span className="text-red-500">*</span></label>
                <input type="datetime-local" name="clockInAt" required className="input w-full text-sm" />
              </div>
              <div>
                <label className="label text-xs">Clock Out <span className="text-red-500">*</span></label>
                <input type="datetime-local" name="clockOutAt" required className="input w-full text-sm" />
              </div>
            </div>
            <div>
              <label className="label text-xs">Break (minutes)</label>
              <input type="number" name="breakMinutes" min="0" max="480" defaultValue="0" className="input w-full text-sm" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={isPending} className="btn-primary text-sm">
                {isPending ? 'Saving…' : 'Add Entry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
