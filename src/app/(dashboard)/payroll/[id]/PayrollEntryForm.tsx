'use client'

import { useState, useActionState } from 'react'
import { upsertPayrollEntry } from '@/actions/payroll'
import type { PayrollResult } from '@/actions/payroll'

interface Props {
  periodId:          string
  profileId:         string
  profileName:       string
  currentActualHours: number | null
  currentHourlyRate:  string | null
  currentNote:        string | null
}

export default function PayrollEntryForm({
  periodId,
  profileId,
  profileName,
  currentActualHours,
  currentHourlyRate,
  currentNote,
}: Props) {
  const [open, setOpen] = useState(false)

  const action = upsertPayrollEntry.bind(null, periodId)
  const [state, dispatch, isPending] = useActionState<PayrollResult | null, FormData>(action, null)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-terracotta hover:underline"
      >
        Edit
      </button>
    )
  }

  return (
    <form action={dispatch} className="space-y-2 min-w-[220px]">
      <p className="text-xs font-medium text-stone-700">{profileName}</p>
      <input type="hidden" name="profileId" value={profileId} />

      <div>
        <label className="text-[10px] text-stone-500 uppercase tracking-wide">Actual hours</label>
        <input
          type="number"
          name="actualHours"
          defaultValue={currentActualHours ?? ''}
          min="0"
          max="168"
          step="0.25"
          placeholder="Leave blank to use scheduled"
          className="input w-full text-xs py-1"
        />
      </div>

      <div>
        <label className="text-[10px] text-stone-500 uppercase tracking-wide">Hourly rate ($)</label>
        <input
          type="text"
          name="hourlyRate"
          defaultValue={currentHourlyRate ?? ''}
          placeholder="e.g. 15.00"
          className="input w-full text-xs py-1"
        />
      </div>

      <div>
        <label className="text-[10px] text-stone-500 uppercase tracking-wide">Note</label>
        <input
          type="text"
          name="note"
          defaultValue={currentNote ?? ''}
          placeholder="Optional…"
          className="input w-full text-xs py-1"
        />
      </div>

      {state && !state.success && (
        <p className="text-xs text-red-600">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-xs text-green-600">Saved</p>
      )}

      <div className="flex gap-1">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-xs py-0.5 px-2">
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="btn-primary text-xs py-0.5 px-2">
          {isPending ? '…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
