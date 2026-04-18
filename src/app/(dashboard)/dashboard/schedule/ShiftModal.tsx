'use client'

import { useState, useActionState } from 'react'
import { createShifts, updateShift, deleteShift } from '@/actions/schedule'
import type { ScheduleResult } from '@/actions/schedule'
import type { ShiftRow, ShiftType } from '@/lib/schedule-types'
import { SHIFT_TYPE_LABELS } from '@/lib/schedule-types'
import { DAY_NAMES } from '@/lib/week-utils'

type UpdateAction = (prev: ScheduleResult<ShiftRow> | null, fd: FormData) => Promise<ScheduleResult<ShiftRow>>
type CreateAction = (prev: ScheduleResult<{ count: number }> | null, fd: FormData) => Promise<ScheduleResult<{ count: number }>>

export interface Worker {
  id:      string
  name:    string
  type:    'profile' | 'employee'
  storeId: string | null
}

export interface StoreOption {
  id:   string
  name: string
}

interface Props {
  weekStart:  string
  workers:    Worker[]
  stores:     StoreOption[]
  editShift?: ShiftRow
}

const SHIFT_TYPES: ShiftType[] = ['work', 'day_off', 'vacation', 'sick', 'holiday']

function typeEmoji(type: ShiftType): string {
  switch (type) {
    case 'work':     return '🗓'
    case 'day_off':  return '😴'
    case 'vacation': return '🏖'
    case 'sick':     return '🤒'
    case 'holiday':  return '🎉'
  }
}

export default function ShiftModal({ weekStart, workers, stores, editShift }: Props) {
  const [open, setOpen]           = useState(false)
  // Track whether a submission happened in this open session
  // Prevents stale `success: true` from auto-closing a freshly reopened modal
  const [submitted, setSubmitted] = useState(false)
  const [shiftType, setShiftType] = useState<ShiftType>(editShift?.shiftType ?? 'work')

  // Edit mode: single worker tracked by key "type:id"
  const [selectedWorkerId, setSelectedWorkerId] = useState(
    editShift
      ? (editShift.employeeId ? `employee:${editShift.employeeId}` : `profile:${editShift.profileId}`)
      : '',
  )

  // Add mode: multiple workers tracked as a Set of "type:id" keys
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<Set<string>>(new Set())

  // Store auto-default: follows selected worker in edit mode, or single-selection in add mode
  const singleSelectedKey = editShift ? selectedWorkerId : (selectedWorkerIds.size === 1 ? [...selectedWorkerIds][0] : null)
  const autoStoreId = singleSelectedKey
    ? (workers.find(w => `${w.type}:${w.id}` === singleSelectedKey)?.storeId ?? null)
    : null

  const [selectedStoreId, setSelectedStoreId] = useState<string>(
    editShift?.storeId ?? autoStoreId ?? '',
  )

  // Day checkboxes state (for Add mode only)
  const [selectedDays, setSelectedDays] = useState<Set<number>>(
    editShift ? new Set([editShift.dayOfWeek]) : new Set(),
  )

  // ── Actions ──────────────────────────────────────────────────────────────────

  const updateAction: UpdateAction = editShift
    ? (updateShift.bind(null, editShift.id) as UpdateAction)
    : (() => { throw new Error('No editShift') }) as unknown as UpdateAction

  const [updateState, updateDispatch, updatePending] = useActionState<ScheduleResult<ShiftRow> | null, FormData>(
    updateAction, null,
  )

  const [createState, createDispatch, createPending] = useActionState<ScheduleResult<{ count: number }> | null, FormData>(
    createShifts as CreateAction, null,
  )

  const isPending = editShift ? updatePending : createPending
  const state     = editShift ? updateState : createState

  function openModal() {
    setOpen(true)
    setSubmitted(false)
  }

  function close() {
    setOpen(false)
    setSubmitted(false)
    setShiftType('work')
    setSelectedDays(new Set())
    setSelectedWorkerId('')
    setSelectedWorkerIds(new Set())
    setSelectedStoreId('')
  }

  // Only auto-close if a submission actually happened in this session
  if (state?.success && open && submitted) close()

  const isWork   = shiftType === 'work'
  const isDayOff = shiftType === 'day_off'
  const showTimes = !isDayOff

  // ── Form submit handler ───────────────────────────────────────────────────────

  function handleSubmit(fd: FormData) {
    setSubmitted(true)

    if (editShift) {
      // Edit: resolve single worker
      const [wType, wId] = selectedWorkerId.split(':')
      if (wType === 'profile') fd.set('profileId', wId ?? '')
      if (isDayOff) { fd.set('startTime', '00:00'); fd.set('endTime', '00:00') }
      fd.set('dayOfWeek', String(editShift.dayOfWeek))
      updateDispatch(fd)
    } else {
      // Add: send all selected profile IDs
      for (const key of selectedWorkerIds) {
        const [wt, wid] = key.split(':')
        if (wt === 'profile') fd.append('profileIds', wid)
      }
      if (isDayOff) { fd.set('startTime', '00:00'); fd.set('endTime', '00:00') }
      createDispatch(fd)
    }
  }

  // ── Helper: toggle a worker in the multi-select set ───────────────────────────

  function toggleWorker(key: string, checked: boolean) {
    setSelectedWorkerIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(key)
      } else {
        next.delete(key)
      }
      // If exactly one worker selected, auto-set their store
      if (next.size === 1) {
        const [wt, wid] = [...next][0].split(':')
        const worker = workers.find(w => w.type === wt && w.id === wid)
        if (worker?.storeId) setSelectedStoreId(worker.storeId)
      }
      return next
    })
  }

  if (!open) {
    return editShift ? (
      <button onClick={openModal} className="text-[10px] text-terracotta hover:underline">
        Edit
      </button>
    ) : (
      <button onClick={openModal} className="btn-primary text-xs px-3 py-1.5">
        + Add Shift
      </button>
    )
  }

  const profileWorkers  = workers.filter(w => w.type === 'profile')
  const employeeWorkers = workers.filter(w => w.type === 'employee')

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={close} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white">
            <h2 className="text-base font-semibold text-stone-900">
              {editShift ? 'Edit Entry' : 'Add Schedule Entry'}
            </h2>
            <button onClick={close} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
          </div>

          <form action={handleSubmit} className="px-6 py-4 space-y-4">
            <input type="hidden" name="weekStart" value={weekStart} />

            {/* Shift type */}
            <div>
              <label className="label">Type</label>
              <div className="grid grid-cols-5 gap-1">
                {SHIFT_TYPES.map(t => (
                  <label
                    key={t}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 cursor-pointer text-center transition-colors
                      ${shiftType === t
                        ? 'border-terracotta bg-terracotta/5 text-terracotta'
                        : 'border-stone-200 text-stone-500 hover:border-stone-400'
                      }`}
                  >
                    <input
                      type="radio"
                      name="shiftType"
                      value={t}
                      checked={shiftType === t}
                      onChange={() => setShiftType(t)}
                      className="sr-only"
                    />
                    <span className="text-lg leading-none">{typeEmoji(t)}</span>
                    <span className="text-[10px] font-medium leading-tight">{SHIFT_TYPE_LABELS[t]}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Employee(s) */}
            <div>
              <label className="label">
                {editShift ? 'Employee' : `Employee${selectedWorkerIds.size > 1 ? `s (${selectedWorkerIds.size} selected)` : 's'}`}
              </label>

              {editShift ? (
                // Edit mode: single dropdown
                <select
                  name="workerSelect"
                  value={selectedWorkerId}
                  onChange={e => {
                    setSelectedWorkerId(e.target.value)
                    const [wt, wid] = e.target.value.split(':')
                    const worker = workers.find(w => w.type === wt && w.id === wid)
                    setSelectedStoreId(worker?.storeId ?? '')
                  }}
                  required
                  className="input w-full"
                >
                  <option value="" disabled>Select employee…</option>
                  {profileWorkers.length > 0 && (
                    <optgroup label="Dashboard Users">
                      {profileWorkers.map(w => (
                        <option key={w.id} value={`profile:${w.id}`}>{w.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {employeeWorkers.length > 0 && (
                    <optgroup label="Staff (no dashboard access)">
                      {employeeWorkers.map(w => (
                        <option key={w.id} value={`employee:${w.id}`}>{w.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              ) : (
                // Add mode: multi-select checkboxes
                <div className="border border-stone-200 rounded-lg divide-y divide-stone-100 max-h-48 overflow-y-auto">
                  {profileWorkers.length > 0 && (
                    <>
                      {profileWorkers.length < workers.length && (
                        <div className="px-3 py-1 bg-stone-50">
                          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Dashboard Users</p>
                        </div>
                      )}
                      {profileWorkers.map(w => {
                        const key = `profile:${w.id}`
                        const checked = selectedWorkerIds.has(key)
                        return (
                          <label key={w.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-stone-50 transition-colors ${checked ? 'bg-terracotta/5' : ''}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => toggleWorker(key, e.target.checked)}
                              className="rounded border-stone-300 text-terracotta focus:ring-terracotta"
                            />
                            <span className="text-sm text-stone-800">{w.name}</span>
                            {w.storeId && (
                              <span className="ml-auto text-[10px] text-stone-400">
                                {stores.find(s => s.id === w.storeId)?.name ?? ''}
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </>
                  )}
                  {employeeWorkers.length > 0 && (
                    <>
                      {employeeWorkers.length < workers.length && (
                        <div className="px-3 py-1 bg-stone-50">
                          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">Staff</p>
                        </div>
                      )}
                      {employeeWorkers.map(w => {
                        const key = `employee:${w.id}`
                        const checked = selectedWorkerIds.has(key)
                        return (
                          <label key={w.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-stone-50 transition-colors ${checked ? 'bg-terracotta/5' : ''}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => toggleWorker(key, e.target.checked)}
                              className="rounded border-stone-300 text-terracotta focus:ring-terracotta"
                            />
                            <span className="text-sm text-stone-800">{w.name}</span>
                            {w.storeId && (
                              <span className="ml-auto text-[10px] text-stone-400">
                                {stores.find(s => s.id === w.storeId)?.name ?? ''}
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </>
                  )}
                  {workers.length === 0 && (
                    <p className="px-3 py-4 text-sm text-stone-400 text-center">No employees found.</p>
                  )}
                </div>
              )}

              {!editShift && selectedWorkerIds.size === 0 && (
                <p className="text-xs text-stone-400 mt-1">Select at least one employee.</p>
              )}
            </div>

            {/* Day(s) — checkboxes for Add, read-only for Edit */}
            <div>
              <label className="label">{editShift ? 'Day' : 'Day(s)'}</label>
              {editShift ? (
                <p className="text-sm text-stone-700 font-medium">{DAY_NAMES[editShift.dayOfWeek]}</p>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((name, idx) => {
                    const checked = selectedDays.has(idx)
                    return (
                      <label
                        key={idx}
                        className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 cursor-pointer text-center transition-colors
                          ${checked
                            ? 'border-terracotta bg-terracotta/5 text-terracotta'
                            : 'border-stone-200 text-stone-500 hover:border-stone-400'
                          }`}
                      >
                        <input
                          type="checkbox"
                          name="dayOfWeek"
                          value={idx}
                          checked={checked}
                          onChange={e => {
                            setSelectedDays(prev => {
                              const next = new Set(prev)
                              if (e.target.checked) next.add(idx)
                              else next.delete(idx)
                              return next
                            })
                          }}
                          className="sr-only"
                        />
                        <span className="text-[11px] font-medium leading-tight">{name.slice(0, 3)}</span>
                      </label>
                    )
                  })}
                </div>
              )}
              {!editShift && selectedDays.size === 0 && (
                <p className="text-xs text-stone-400 mt-1">Select at least one day.</p>
              )}
            </div>

            {/* Times */}
            {showTimes && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start time</label>
                  <input
                    type="time"
                    name="startTime"
                    defaultValue={
                      editShift?.startTime && editShift.startTime !== '00:00'
                        ? editShift.startTime
                        : isWork ? '09:00' : '00:00'
                    }
                    required
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">End time</label>
                  <input
                    type="time"
                    name="endTime"
                    defaultValue={
                      editShift?.endTime && editShift.endTime !== '00:00'
                        ? editShift.endTime
                        : isWork ? '17:00' : '23:59'
                    }
                    required
                    className="input w-full"
                  />
                </div>
              </div>
            )}

            {isDayOff && (
              <p className="text-xs text-stone-400">Day Off blocks the full day — no other entries can be added for this employee on this day.</p>
            )}

            {/* Store */}
            {stores.length > 0 && (
              <div>
                <label className="label">Store</label>
                <select
                  name="storeId"
                  value={selectedStoreId}
                  onChange={e => setSelectedStoreId(e.target.value)}
                  className="input w-full"
                >
                  <option value="">— Any / Not specified —</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {isWork && (
              <div>
                <label className="label">Position (optional)</label>
                <input
                  type="text"
                  name="position"
                  defaultValue={editShift?.position ?? ''}
                  list="pos-opts"
                  placeholder="e.g. Cashier"
                  className="input w-full"
                />
                <datalist id="pos-opts">
                  {['Cashier', 'Stock', 'Manager on Duty', 'General'].map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
            )}

            <div>
              <label className="label">Note (optional)</label>
              <input
                type="text"
                name="note"
                defaultValue={editShift?.note ?? ''}
                placeholder={isWork ? 'Internal note…' : 'e.g. Pre-approved vacation'}
                className="input w-full"
              />
            </div>

            {state && !state.success && <p className="text-sm text-red-600">{state.error}</p>}
            {createState?.success && submitted && (
              <p className="text-sm text-emerald-700">
                {createState.data.count} shift{createState.data.count !== 1 ? 's' : ''} added.
              </p>
            )}

            <div className="flex items-center justify-between pt-1">
              {editShift ? <DeleteShiftButton id={editShift.id} onDeleted={close} /> : <span />}
              <div className="flex gap-2">
                <button type="button" onClick={close} className="btn-secondary text-sm">Cancel</button>
                <button
                  type="submit"
                  disabled={isPending || (!editShift && (selectedDays.size === 0 || selectedWorkerIds.size === 0))}
                  className="btn-primary text-sm"
                >
                  {isPending
                    ? 'Saving…'
                    : editShift
                      ? 'Save'
                      : `Add ${selectedWorkerIds.size > 1 || selectedDays.size > 1
                          ? `${selectedWorkerIds.size * selectedDays.size} Shifts`
                          : 'Shift'
                        }`
                  }
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

function DeleteShiftButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  async function handleDelete() {
    if (!confirm('Delete this entry?')) return
    const result = await deleteShift(id)
    if (result.success) onDeleted()
  }
  return (
    <button type="button" onClick={handleDelete} className="text-sm text-red-600 hover:text-red-800">Delete</button>
  )
}
