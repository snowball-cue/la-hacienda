'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createPayrollPeriod } from '@/actions/payroll'
import type { PayrollResult, PeriodRow } from '@/actions/payroll'
import { useEffect } from 'react'

export default function NewPeriodForm({
  defaultStart,
  defaultEnd,
}: {
  defaultStart: string
  defaultEnd:   string
}) {
  const router = useRouter()
  type CreatePeriodAction = (prev: PayrollResult<PeriodRow> | null, fd: FormData) => Promise<PayrollResult<PeriodRow>>
  const [state, dispatch, isPending] = useActionState<PayrollResult<PeriodRow> | null, FormData>(
    createPayrollPeriod as CreatePeriodAction, null,
  )

  useEffect(() => {
    if (state?.success) {
      router.push(`/dashboard/payroll/${state.data.id}`)
    }
  }, [state, router])

  return (
    <form action={dispatch} className="card p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Period Start</label>
          <input
            type="date"
            name="periodStart"
            defaultValue={defaultStart}
            required
            className="input w-full"
          />
        </div>
        <div>
          <label className="label">Period End</label>
          <input
            type="date"
            name="periodEnd"
            defaultValue={defaultEnd}
            required
            className="input w-full"
          />
        </div>
      </div>

      <div>
        <label className="label">Frequency</label>
        <select name="frequency" defaultValue="weekly" className="input w-full">
          <option value="weekly">Weekly</option>
          <option value="biweekly">Bi-weekly</option>
        </select>
        <p className="text-xs text-stone-400 mt-1">
          For bi-weekly periods, overtime is calculated per week (Texas FLSA rule).
        </p>
      </div>

      {state && !state.success && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Creating…' : 'Create Period'}
        </button>
      </div>
    </form>
  )
}
