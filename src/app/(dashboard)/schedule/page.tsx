import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getScheduleForWeek } from '@/actions/schedule'
import {
  sanitizeWeekParam,
  addWeeks,
  formatWeekRange,
} from '@/lib/week-utils'
import ShiftModal from './ShiftModal'
import CopyWeekButton from './CopyWeekButton'
import ScheduleControls from './ScheduleControls'
import ScheduleGrid from './ScheduleGrid'

export const metadata: Metadata = { title: 'Schedule' }

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; store?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const params    = await searchParams
  const weekStart = sanitizeWeekParam(params.week)
  const prevWeek  = addWeeks(weekStart, -1)
  const nextWeek  = addWeeks(weekStart,  1)
  const storeId   = params.store || undefined

  const isManager = hasMinimumRole(user.role, 'manager')

  const [shiftsResult, profiles, stores] = await Promise.all([
    getScheduleForWeek(weekStart, undefined, storeId ? [storeId] : undefined),
    isManager
      ? prisma.profile.findMany({
          where: { isActive: true },
          orderBy: { lastName: 'asc' },
          select: { id: true, firstName: true, lastName: true, middleName: true, role: true },
        })
      : [],
    isManager
      ? prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } })
      : [],
  ])

  const shifts = shiftsResult.success ? shiftsResult.data : []
  const selectedStore = stores.find(s => s.id === storeId)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="text-sm text-stone-500 mt-1">
            {formatWeekRange(weekStart)}
            {selectedStore && (
              <span className="ml-2 text-terracotta font-medium">· {selectedStore.name}</span>
            )}
          </p>
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <CopyWeekButton fromWeekStart={prevWeek} toWeekStart={weekStart} />
            <ShiftModal
              weekStart={weekStart}
              profiles={profiles.map(p => ({ id: p.id, name: formatEmployeeName(p.lastName, p.firstName, p.middleName), role: p.role }))}
              stores={stores}
            />
          </div>
        )}
      </div>

      {/* ── Filters: store + date jump ──────────────────────────────────── */}
      {isManager && (
        <ScheduleControls
          stores={stores}
          currentStoreId={storeId}
          currentWeek={weekStart}
        />
      )}

      {/* ── Week navigation ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/schedule?week=${prevWeek}${storeId ? `&store=${storeId}` : ''}`}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          ← Prev
        </Link>
        <Link
          href={`/dashboard/schedule${storeId ? `?store=${storeId}` : ''}`}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          This week
        </Link>
        <Link
          href={`/dashboard/schedule?week=${nextWeek}${storeId ? `&store=${storeId}` : ''}`}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          Next →
        </Link>
      </div>

      {/* ── Schedule grid (client — filtering, selection, bulk delete) ──── */}
      {shifts.length === 0 ? (
        <div className="card p-8 text-center text-stone-400 text-sm">
          No shifts scheduled for this week.
          {isManager && ' Use "Add Shift" to create the first shift.'}
        </div>
      ) : (
        <ScheduleGrid
          shifts={shifts}
          weekStart={weekStart}
          isManager={isManager}
          profiles={profiles.map(p => ({ id: p.id, name: formatEmployeeName(p.lastName, p.firstName, p.middleName), role: p.role }))}
          stores={stores}
        />
      )}
    </div>
  )
}
