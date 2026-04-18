import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getScheduleForWeek } from '@/actions/schedule'
import { getSelectedStoreIds } from '@/lib/store-filter'
import {
  sanitizeWeekParam,
  addWeeks,
  formatWeekRange,
} from '@/lib/week-utils'
import { shiftTypeStyle, SHIFT_TYPE_LABELS } from '@/lib/schedule-types'
import ShiftModal from './ShiftModal'
import type { Worker } from './ShiftModal'
import CopyWeekButton from './CopyWeekButton'
import ScheduleGrid from './ScheduleGrid'

export const metadata: Metadata = { title: 'Schedule' }

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const params    = await searchParams
  const weekStart = sanitizeWeekParam(params.week)
  const prevWeek  = addWeeks(weekStart, -1)
  const nextWeek  = addWeeks(weekStart,  1)

  const isManager = hasMinimumRole(user.role, 'manager')

  const [selectedStores, profiles, stores] = await Promise.all([
    getSelectedStoreIds(),
    isManager
      ? prisma.profile.findMany({
          where: { isActive: true },
          orderBy: { lastName: 'asc' },
          select: { id: true, firstName: true, lastName: true, middleName: true, storeId: true },
        })
      : [],
    isManager
      ? prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
      : [],
  ])

  const shiftsResult = await getScheduleForWeek(weekStart, undefined, selectedStores.length ? selectedStores : undefined)

  const shifts = shiftsResult.success ? shiftsResult.data : []

  const workers: Worker[] = profiles.map(p => ({
    id:      p.id,
    name:    formatEmployeeName(p.lastName, p.firstName, p.middleName),
    type:    'profile' as const,
    storeId: p.storeId,
  }))

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="text-sm text-stone-500 mt-1">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/dashboard/schedule/time-off" className="btn-secondary text-xs px-3 py-1.5">
            Time Off Requests
          </Link>
          {isManager && (
            <>
              <Link href="/dashboard/employees" className="btn-secondary text-xs px-3 py-1.5">
                Manage Employees
              </Link>
              <CopyWeekButton fromWeekStart={prevWeek} toWeekStart={weekStart} />
              <ShiftModal weekStart={weekStart} workers={workers} stores={stores} />
            </>
          )}
        </div>
      </div>

      {/* ── Week nav ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Link href={`/dashboard/schedule?week=${prevWeek}`} className="btn-secondary text-xs px-3 py-1.5">← Prev</Link>
        <Link href="/dashboard/schedule" className="btn-secondary text-xs px-3 py-1.5">This week</Link>
        <Link href={`/dashboard/schedule?week=${nextWeek}`} className="btn-secondary text-xs px-3 py-1.5">Next →</Link>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {(['work', 'day_off', 'vacation', 'sick', 'holiday'] as const).map(t => {
          const s = shiftTypeStyle(t)
          return (
            <span key={t} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.border} ${s.text}`}>
              {SHIFT_TYPE_LABELS[t]}
            </span>
          )
        })}
        {isManager && (
          <span className="text-xs text-stone-400 ml-auto">Hover a card to see contact info</span>
        )}
      </div>

      {/* ── Schedule grid (client — filtering, selection, bulk delete) ──── */}
      {shifts.length === 0 ? (
        <div className="card p-8 text-center text-stone-400 text-sm">
          No entries for this week.
          {isManager && ' Use "Add Shift" to schedule employees.'}
        </div>
      ) : (
        <ScheduleGrid
          shifts={shifts}
          weekStart={weekStart}
          isManager={isManager}
          workers={workers}
          stores={stores}
        />
      )}
    </div>
  )
}
