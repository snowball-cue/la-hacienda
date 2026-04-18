'use client'

import { useState, useActionState } from 'react'
import { createShifts, updateShift, deleteShift } from '@/actions/schedule'
import type { ScheduleResult } from '@/actions/schedule'
import type { ShiftRow } from '@/lib/schedule-types'
import { DAY_NAMES } from '@/lib/week-utils'

type UpdateAction = (prev: ScheduleResult<ShiftRow> | null, fd: FormData) => Promise<ScheduleResult<ShiftRow>>

interface Props {
  weekStart: string
  profiles:  Array<{ id: string; name: string; role: string }>
  stores:    Array<{ id: string; name: string }>
  editShift?: ShiftRow
}

const POSITIONS = ['Cashier', 'Stock', 'Manager on Duty', 'General']

// ── Add Shift Form (multi-day) ───────────────────────────────────────────────

function AddShiftForm({
  weekStart,
  profiles,
  stores,
  onClose,
}: {
  weekStart: string
  profiles: Props['profiles']
  stores:   Props['stores']
  onClose: () => void
}) {
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function toggleDay(day: number) {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day],
    )
  }

  function selectAll() { setSelectedDays([0, 1, 2, 3, 4, 5, 6]) }
  function unselectAll() { setSelectedDays([]) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (selectedDays.length === 0) {
      setError('Select at least one day.')
      return
    }
    setPending(true)
    setError(null)

    const fd = new FormData(e.currentTarget)
    // Remove any stale dayOfWeek entries and add selected ones
    // (the hidden inputs are added dynamically below via the selected state)
    selectedDays.forEach(d => fd.append('dayOfWeek', String(d)))

    const result = await createShifts(null, fd)
    setPending(false)
    if (result.success) {
      onClose()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
      <input type="hidden" name="weekStart" value={weekStart} />

      {/* Employee */}
      <div>
        <label className="label">Employee</label>
        <select name="profileId" required className="input w-full">
          <option value="" disabled>Select employee…</option>
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Store */}
      {stores.length > 0 && (
        <div>
          <label className="label">Store (optional)</label>
          <select name="storeId" className="input w-full">
            <option value="">All stores</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Days — checklist with Select All / Unselect All */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Days</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-terracotta hover:underline"
            >
              Select All
            </button>
            <span className="text-xs text-stone-300">|</span>
            <button
              type="button"
              onClick={unselectAll}
              className="text-xs text-stone-400 hover:underline"
            >
              Unselect All
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {DAY_NAMES.map((name, idx) => (
            <label
              key={idx}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                selectedDays.includes(idx)
                  ? 'border-terracotta bg-terracotta/5 text-terracotta font-medium'
                  : 'border-stone-200 text-stone-600 hover:border-stone-300'
              }`}
            >
              <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                selectedDays.includes(idx)
                  ? 'bg-terracotta border-terracotta'
                  : 'border-stone-300'
              }`}>
                {selectedDays.includes(idx) && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                className="sr-only"
                checked={selectedDays.includes(idx)}
                onChange={() => toggleDay(idx)}
              />
              {name}
            </label>
          ))}
        </div>
        {selectedDays.length > 0 && (
          <p className="text-xs text-stone-400 mt-1.5">
            {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start time</label>
          <input type="time" name="startTime" defaultValue="09:00" required className="input w-full" />
        </div>
        <div>
          <label className="label">End time</label>
          <input type="time" name="endTime" defaultValue="17:00" required className="input w-full" />
        </div>
      </div>

      {/* Position */}
      <div>
        <label className="label">Position (optional)</label>
        <input
          type="text"
          name="position"
          list="position-options"
          placeholder="e.g. Cashier"
          className="input w-full"
        />
        <datalist id="position-options">
          {POSITIONS.map(p => <option key={p} value={p} />)}
        </datalist>
      </div>

      {/* Note */}
      <div>
        <label className="label">Note (optional)</label>
        <input type="text" name="note" placeholder="Internal note…" className="input w-full" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
        <button type="submit" disabled={pending} className="btn-primary text-sm">
          {pending ? 'Saving…' : `Add ${selectedDays.length > 1 ? `${selectedDays.length} Shifts` : 'Shift'}`}
        </button>
      </div>
    </form>
  )
}

// ── Edit Shift Form (single day) ─────────────────────────────────────────────

function EditShiftForm({
  weekStart,
  profiles,
  editShift,
  onClose,
}: {
  weekStart: string
  profiles: Props['profiles']
  editShift: ShiftRow
  onClose: () => void
}) {
  const action = updateShift.bind(null, editShift.id) as UpdateAction
  const [state, dispatch, isPending] = useActionState<ScheduleResult<ShiftRow> | null, FormData>(
    action, null,
  )

  return (
    <form action={dispatch} className="px-6 py-4 space-y-4">
      <input type="hidden" name="weekStart" value={weekStart} />

      {/* Employee */}
      <div>
        <label className="label">Employee</label>
        <select name="profileId" defaultValue={editShift.profileId} required className="input w-full">
          <option value="" disabled>Select employee…</option>
          {profiles.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Day — single select for edits */}
      <div>
        <label className="label">Day</label>
        <select name="dayOfWeek" defaultValue={editShift.dayOfWeek} className="input w-full">
          {DAY_NAMES.map((name, idx) => (
            <option key={idx} value={idx}>{name}</option>
          ))}
        </select>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start time</label>
          <input type="time" name="startTime" defaultValue={editShift.startTime} required className="input w-full" />
        </div>
        <div>
          <label className="label">End time</label>
          <input type="time" name="endTime" defaultValue={editShift.endTime} required className="input w-full" />
        </div>
      </div>

      {/* Position */}
      <div>
        <label className="label">Position (optional)</label>
        <input
          type="text"
          name="position"
          defaultValue={editShift.position ?? ''}
          list="position-options-edit"
          placeholder="e.g. Cashier"
          className="input w-full"
        />
        <datalist id="position-options-edit">
          {POSITIONS.map(p => <option key={p} value={p} />)}
        </datalist>
      </div>

      {/* Note */}
      <div>
        <label className="label">Note (optional)</label>
        <input type="text" name="note" defaultValue={editShift.note ?? ''} placeholder="Internal note…" className="input w-full" />
      </div>

      {state && !state.success && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex items-center justify-between pt-1">
        <DeleteShiftButton id={editShift.id} onDeleted={onClose} />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button type="submit" disabled={isPending} className="btn-primary text-sm">
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  )
}

// ── ShiftModal ───────────────────────────────────────────────────────────────

export default function ShiftModal({ weekStart, profiles, stores, editShift }: Props) {
  const [open, setOpen] = useState(false)

  function close() { setOpen(false) }

  if (!open) {
    return editShift ? (
      <button onClick={() => setOpen(true)} className="text-[10px] text-terracotta hover:underline">
        Edit
      </button>
    ) : (
      <button onClick={() => setOpen(true)} className="btn-primary text-xs px-3 py-1.5">
        + Add Shift
      </button>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={close} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900">
              {editShift ? 'Edit Shift' : 'Add Shift'}
            </h2>
            <button onClick={close} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
          </div>

          {editShift ? (
            <EditShiftForm
              weekStart={weekStart}
              profiles={profiles}
              editShift={editShift}
              onClose={close}
            />
          ) : (
            <AddShiftForm
              weekStart={weekStart}
              profiles={profiles}
              stores={stores}
              onClose={close}
            />
          )}
        </div>
      </div>
    </>
  )
}

function DeleteShiftButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  async function handleDelete() {
    if (!confirm('Delete this shift?')) return
    const result = await deleteShift(id)
    if (result.success) onDeleted()
  }

  return (
    <button type="button" onClick={handleDelete} className="text-sm text-red-600 hover:text-red-800">
      Delete shift
    </button>
  )
}
