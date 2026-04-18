'use client'

import { useActionState, useEffect } from 'react'
import { clockIn, clockOut } from '@/actions/time-entries'
import type { TimeResult, TimeEntryRow } from '@/actions/time-entries'

interface Props {
  stores:         { id: string; name: string }[]
  openEntry:      TimeEntryRow | null
  defaultStoreId: string | null
}

function ElapsedTimer({ clockInAt }: { clockInAt: string }) {
  const start = new Date(clockInAt).getTime()
  const now   = Date.now()
  const mins  = Math.floor((now - start) / 60_000)
  const h     = Math.floor(mins / 60)
  const m     = mins % 60
  return <span>{h}h {m}m elapsed</span>
}

export default function ClockInWidget({ stores, openEntry, defaultStoreId }: Props) {
  const [clockInState,  dispatchIn,  pendingIn]  = useActionState<TimeResult | null, FormData>(clockIn,  null)
  const [clockOutState, dispatchOut, pendingOut] = useActionState<TimeResult | null, FormData>(
    openEntry ? clockOut.bind(null, openEntry.id) : clockIn, // fallback unused
    null,
  )

  useEffect(() => {
    if (clockInState?.success || clockOutState?.success) {
      window.location.reload()
    }
  }, [clockInState, clockOutState])

  const inErr  = !clockInState?.success  ? clockInState?.error  : null
  const outErr = !clockOutState?.success ? clockOutState?.error : null

  if (openEntry) {
    // Clocked in — show clock-out widget
    return (
      <div className="card p-5 border-l-4 border-emerald-500">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-stone-900">Currently clocked in</p>
            <p className="text-sm text-stone-500 mt-0.5">
              {openEntry.storeName} ·{' '}
              <ElapsedTimer clockInAt={openEntry.clockInAt} />
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              Since {new Date(openEntry.clockInAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          </div>
          <form action={dispatchOut} className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="label text-xs">Break (minutes)</label>
              <input
                name="breakMinutes"
                type="number"
                min="0"
                max="480"
                defaultValue="0"
                className="input w-24 text-sm"
              />
            </div>
            <button type="submit" disabled={pendingOut} className="btn-secondary text-sm border-red-300 text-red-700 hover:bg-red-50">
              {pendingOut ? 'Saving…' : 'Clock Out'}
            </button>
          </form>
        </div>
        {outErr && <p className="text-sm text-red-600 mt-2">{outErr}</p>}
      </div>
    )
  }

  // Not clocked in — show clock-in widget
  return (
    <div className="card p-5">
      <p className="font-semibold text-stone-900 mb-3">Clock In</p>
      <form action={dispatchIn} className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="label text-xs">Store <span className="text-red-500">*</span></label>
          <select name="storeId" defaultValue={defaultStoreId ?? ''} required className="input text-sm">
            <option value="">Select store…</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <button type="submit" disabled={pendingIn} className="btn-primary text-sm">
          {pendingIn ? 'Clocking in…' : 'Clock In'}
        </button>
      </form>
      {inErr && <p className="text-sm text-red-600 mt-2">{inErr}</p>}
    </div>
  )
}
