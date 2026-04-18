'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { deleteShifts, deleteWeekShifts } from '@/actions/schedule'
import type { ShiftRow } from '@/lib/schedule-types'
import { formatTimeShort, shiftDurationHours, shiftTypeStyle, SHIFT_TYPE_LABELS } from '@/lib/schedule-types'
import { DAY_NAMES, getDayDate } from '@/lib/week-utils'
import ShiftModal from './ShiftModal'
import type { Worker } from './ShiftModal'
import PIIHoverCard from './PIIHoverCard'

interface Props {
  shifts:    ShiftRow[]
  weekStart: string
  isManager: boolean
  workers:   Worker[]
  stores:    Array<{ id: string; name: string }>
}

type ConfirmMode = 'selected' | 'all' | null

export default function ScheduleGrid({ shifts, weekStart, isManager, workers, stores }: Props) {
  const router = useRouter()

  // ── Filter state ───────────────────────────────────────────────────────────
  const [filterWorker,   setFilterWorker]   = useState('')
  const [filterTimeFrom, setFilterTimeFrom] = useState('')
  const [filterTimeTo,   setFilterTimeTo]   = useState('')
  const [hiddenDays,     setHiddenDays]     = useState<Set<number>>(new Set())

  // ── Selection state ────────────────────────────────────────────────────────
  const [selectMode,  setSelectMode]  = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // ── Action state ───────────────────────────────────────────────────────────
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pending, startTransition]    = useTransition()

  // ── Apply filters ──────────────────────────────────────────────────────────
  const visibleShifts = useMemo(() => {
    return shifts.filter(s => {
      if (filterWorker   && s.profileId !== filterWorker)    return false
      if (filterTimeFrom && s.startTime < filterTimeFrom)    return false
      if (filterTimeTo   && s.startTime > filterTimeTo)      return false
      if (hiddenDays.has(s.dayOfWeek))                       return false
      return true
    })
  }, [shifts, filterWorker, filterTimeFrom, filterTimeTo, hiddenDays])

  const byDay = useMemo(() => {
    const map = new Map<number, ShiftRow[]>()
    for (let d = 0; d < 7; d++) map.set(d, [])
    for (const s of visibleShifts) map.get(s.dayOfWeek)!.push(s)
    return map
  }, [visibleShifts])

  const hasFilters       = !!(filterWorker || filterTimeFrom || filterTimeTo || hiddenDays.size)
  const allVisibleIds    = useMemo(() => visibleShifts.map(s => s.id), [visibleShifts])

  // ── Selection helpers ──────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function clearSelection() { setSelectedIds(new Set()) }

  function toggleSelectMode() {
    setSelectMode(m => { if (m) clearSelection(); return !m })
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  function openConfirm(mode: ConfirmMode) {
    setActionError(null)
    setConfirmMode(mode)
  }

  function executeDelete() {
    setActionError(null)
    startTransition(async () => {
      const result = confirmMode === 'selected'
        ? await deleteShifts([...selectedIds])
        : hasFilters
          ? await deleteShifts(allVisibleIds)
          : await deleteWeekShifts(weekStart)

      if (result.success) {
        setConfirmMode(null)
        clearSelection()
        if (!hasFilters && confirmMode === 'all') setSelectMode(false)
        router.refresh()
      } else {
        setActionError(result.error)
      }
    })
  }

  const deleteCount   = confirmMode === 'selected' ? selectedIds.size : allVisibleIds.length
  const confirmTitle  = confirmMode === 'selected'
    ? `Delete ${selectedIds.size} selected shift${selectedIds.size !== 1 ? 's' : ''}?`
    : hasFilters
      ? `Delete ${allVisibleIds.length} visible shift${allVisibleIds.length !== 1 ? 's' : ''}?`
      : `Clear entire week (${shifts.length} shift${shifts.length !== 1 ? 's' : ''})?`
  const confirmBody = confirmMode === 'selected'
    ? 'The selected shifts will be permanently removed.'
    : hasFilters
      ? 'All currently visible (filtered) shifts will be permanently removed.'
      : 'All shifts for this week will be permanently removed. This cannot be undone.'

  return (
    <div className="space-y-4">

      {/* ── Filter + selection toolbar ──────────────────────────────────── */}
      {isManager && (
        <div className="card p-4 space-y-3">

          {/* Row 1: employee + time filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="label text-xs">Employee</label>
              <select
                value={filterWorker}
                onChange={e => setFilterWorker(e.target.value)}
                className="input text-xs h-8 py-0"
              >
                <option value="">All employees</option>
                {workers.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label text-xs">Start time from</label>
              <input
                type="time"
                value={filterTimeFrom}
                onChange={e => setFilterTimeFrom(e.target.value)}
                className="input text-xs h-8 py-0"
              />
            </div>

            <div>
              <label className="label text-xs">Start time to</label>
              <input
                type="time"
                value={filterTimeTo}
                onChange={e => setFilterTimeTo(e.target.value)}
                className="input text-xs h-8 py-0"
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilterWorker('')
                  setFilterTimeFrom('')
                  setFilterTimeTo('')
                  setHiddenDays(new Set())
                }}
                className="text-xs text-stone-400 hover:text-stone-700 self-end pb-1"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Row 2: day toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-stone-400 mr-0.5">Days:</span>
            {DAY_NAMES.map((name, idx) => {
              const isHidden = hiddenDays.has(idx)
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setHiddenDays(prev => {
                    const next = new Set(prev)
                    next.has(idx) ? next.delete(idx) : next.add(idx)
                    return next
                  })}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    isHidden
                      ? 'border-stone-200 text-stone-300 line-through'
                      : 'border-terracotta/40 bg-terracotta/5 text-terracotta'
                  }`}
                >
                  {name.slice(0, 3)}
                </button>
              )
            })}
          </div>

          {/* Row 3: select mode + bulk actions */}
          <div className="flex items-center gap-2 flex-wrap border-t border-stone-100 pt-3">
            <button
              type="button"
              onClick={toggleSelectMode}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                selectMode
                  ? 'bg-terracotta text-white border-terracotta'
                  : 'btn-secondary'
              }`}
            >
              {selectMode ? '✓ Selecting' : 'Select Shifts'}
            </button>

            {selectMode && (
              <>
                <button type="button" onClick={() => setSelectedIds(new Set(allVisibleIds))} className="text-xs text-stone-500 hover:text-stone-900 underline underline-offset-2">
                  All visible
                </button>
                <button type="button" onClick={clearSelection} className="text-xs text-stone-500 hover:text-stone-900 underline underline-offset-2">
                  None
                </button>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => openConfirm('selected')}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    Delete {selectedIds.size} selected
                  </button>
                )}
              </>
            )}

            <div className="ml-auto">
              <button
                type="button"
                onClick={() => openConfirm('all')}
                disabled={shifts.length === 0}
                className="text-xs text-red-600 hover:text-red-800 hover:underline disabled:text-stone-300 disabled:no-underline disabled:cursor-default"
              >
                {hasFilters
                  ? `Clear ${allVisibleIds.length} visible`
                  : `Clear entire week (${shifts.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Week grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-2 min-w-0">
        {DAY_NAMES.map((dayName, dayIdx) => {
          const dayDate   = getDayDate(weekStart, dayIdx)
          const dayShifts = byDay.get(dayIdx) ?? []
          const isHidden  = hiddenDays.has(dayIdx)

          return (
            <div key={dayIdx} className={`min-w-0 transition-opacity duration-150 ${isHidden ? 'opacity-20 pointer-events-none' : ''}`}>
              <div className="mb-2 text-center">
                <p className="text-xs font-semibold text-stone-700">{dayName.slice(0, 3)}</p>
                <p className="text-xs text-stone-400">{dayDate.slice(5)}</p>
              </div>

              <div className="space-y-1.5 min-h-[80px]">
                {dayShifts.length === 0 ? (
                  <div className="rounded border border-dashed border-stone-200 h-12" />
                ) : (
                  dayShifts.map(shift => {
                    const style      = shiftTypeStyle(shift.shiftType)
                    const isSelected = selectedIds.has(shift.id)

                    const card = (
                      <div
                        onClick={selectMode ? () => toggleSelect(shift.id) : undefined}
                        className={`relative rounded-md border px-2 py-1.5 text-xs shadow-sm transition-colors flex flex-col min-h-[70px] ${
                          selectMode ? 'cursor-pointer select-none' : 'cursor-default'
                        } ${
                          isSelected
                            ? 'border-terracotta ring-1 ring-terracotta bg-terracotta/5'
                            : `${style.bg} ${style.border}`
                        }`}
                      >
                        {/* Checkbox overlay */}
                        {selectMode && (
                          <div className={`absolute top-1.5 right-1.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-terracotta border-terracotta' : 'border-stone-300 bg-white'
                          }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}

                        {/* Name — always present */}
                        <p className={`font-medium truncate leading-tight ${style.text} ${selectMode ? 'pr-5' : ''}`}>
                          {shift.workerName}
                        </p>

                        {/* Time / label row — same visual weight for all types */}
                        {shift.shiftType === 'work' ? (
                          <>
                            <p className="text-stone-400 leading-tight whitespace-nowrap overflow-hidden">
                              {formatTimeShort(shift.startTime)}–{formatTimeShort(shift.endTime)}
                            </p>
                            <p className="text-stone-400 leading-tight">
                              {shiftDurationHours(shift.startTime, shift.endTime).toFixed(1)}h
                            </p>
                          </>
                        ) : (
                          <>
                            <p className={`text-[11px] leading-tight font-medium ${style.text}`}>
                              {SHIFT_TYPE_LABELS[shift.shiftType]}
                            </p>
                            {/* Spacer keeps card height aligned with work shifts */}
                            <p className="leading-tight invisible select-none" aria-hidden>·</p>
                          </>
                        )}

                        {/* Position badge */}
                        {shift.shiftType === 'work' && shift.position && (
                          <span className="badge bg-stone-100 text-stone-500 text-[9px] mt-0.5 self-start">
                            {shift.position}
                          </span>
                        )}

                        {/* Note */}
                        {shift.note && (
                          <p className="text-stone-400 text-[10px] leading-tight mt-0.5 truncate" title={shift.note}>
                            {shift.note}
                          </p>
                        )}

                        {/* Edit — pinned to bottom */}
                        {isManager && !selectMode && (
                          <div className="mt-auto pt-1">
                            <ShiftModal weekStart={weekStart} workers={workers} stores={stores} editShift={shift} />
                          </div>
                        )}
                      </div>
                    )

                    // Wrap in PIIHoverCard only when not in select mode (clicking interferes)
                    return selectMode ? (
                      <div key={shift.id}>{card}</div>
                    ) : (
                      <PIIHoverCard
                        key={shift.id}
                        shift={shift}
                        isManager={isManager}
                        editNode={null}
                      >
                        {card}
                      </PIIHoverCard>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>

      {visibleShifts.length === 0 && shifts.length > 0 && (
        <div className="card p-6 text-center text-stone-400 text-sm">
          No shifts match the current filters.
        </div>
      )}

      {/* ── Confirm delete modal ────────────────────────────────────────── */}
      {confirmMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !pending && setConfirmMode(null)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-stone-900">{confirmTitle}</h2>
                <p className="text-sm text-stone-500 mt-1">{confirmBody}</p>
              </div>
            </div>

            {actionError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{actionError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmMode(null)} disabled={pending} className="btn-secondary text-sm">
                Keep Shifts
              </button>
              <button
                type="button"
                onClick={executeDelete}
                disabled={pending || deleteCount === 0}
                className="btn-primary text-sm bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
              >
                {pending ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
