'use client'

import { useState, useActionState } from 'react'
import { createTimeOffRequest } from '@/actions/time-off'
import type { TimeOffResult } from '@/actions/time-off'
import type { TimeOffRow, TimeOffType } from '@/lib/schedule-types'
import { TIME_OFF_TYPE_LABELS } from '@/lib/schedule-types'

type CreateAction = (prev: TimeOffResult<TimeOffRow> | null, fd: FormData) => Promise<TimeOffResult<TimeOffRow>>

const TYPES: TimeOffType[] = ['vacation', 'sick', 'personal', 'holiday']

export default function TimeOffForm() {
  const [open, setOpen] = useState(false)

  const [state, dispatch, isPending] = useActionState<TimeOffResult<TimeOffRow> | null, FormData>(
    createTimeOffRequest as CreateAction,
    null,
  )

  function close() { setOpen(false) }

  // Auto-close on success
  if (state?.success && open) {
    setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary text-xs px-3 py-1.5">
        + Request Time Off
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={close} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900">Request Time Off</h2>
            <button onClick={close} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
          </div>

          <form action={dispatch} className="px-6 py-4 space-y-4">
            {/* Type */}
            <div>
              <label className="label">Type</label>
              <select name="type" defaultValue="vacation" required className="input w-full">
                {TYPES.map(t => (
                  <option key={t} value={t}>{TIME_OFF_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">From</label>
                <input type="date" name="dateStart" required className="input w-full" />
              </div>
              <div>
                <label className="label">To</label>
                <input type="date" name="dateEnd" required className="input w-full" />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="label">Note (optional)</label>
              <input
                type="text"
                name="note"
                placeholder="e.g. Family trip, doctor appointment…"
                className="input w-full"
              />
            </div>

            {state && !state.success && (
              <p className="text-sm text-red-600">{state.error}</p>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={close} className="btn-secondary text-sm">Cancel</button>
              <button type="submit" disabled={isPending} className="btn-primary text-sm">
                {isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
