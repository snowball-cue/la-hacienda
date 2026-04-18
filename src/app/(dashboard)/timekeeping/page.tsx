import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'
import { getTimeEntries, getOpenEntry } from '@/actions/time-entries'
import { prisma } from '@/lib/prisma'
import ClockInWidget from './ClockInWidget'
import ManualEntryForm from './ManualEntryForm'

export const metadata: Metadata = { title: 'Timekeeping' }

function formatDuration(clockIn: string, clockOut: string | null, breakMin: number): string {
  if (!clockOut) return 'In progress'
  const mins = (new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 60_000 - breakMin
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return `${h}h ${m}m`
}

export default async function TimekeepingPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; from?: string; to?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')

  const params = await searchParams
  const isManager = hasMinimumRole(user.role, 'manager')

  const [entriesResult, openResult, stores, profiles] = await Promise.all([
    getTimeEntries({
      storeId:   params.store  || undefined,
      dateFrom:  params.from   || undefined,
      dateTo:    params.to     || undefined,
    }),
    getOpenEntry(),
    prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    isManager
      ? prisma.profile.findMany({
          where:   { isActive: true },
          orderBy: { lastName: 'asc' },
          select:  { id: true, firstName: true, lastName: true, middleName: true, storeId: true },
        })
      : [],
  ])

  const entries   = entriesResult.success ? entriesResult.data : []
  const openEntry = openResult.success ? openResult.data : null

  // FLSA overtime: flag entries where total hours in the week > 40
  const totalHours = entries.reduce((sum, e) => sum + (e.hoursWorked ? parseFloat(e.hoursWorked) : 0), 0)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">

      <div>
        <h1 className="page-title">Timekeeping</h1>
        <p className="text-sm text-stone-500 mt-1">Clock-in/out and hour tracking</p>
      </div>

      {/* Clock-in widget */}
      <ClockInWidget
        stores={stores}
        openEntry={openEntry}
        defaultStoreId={stores[0]?.id ?? null}
      />

      {/* Manual entry (managers) */}
      {isManager && (
        <ManualEntryForm stores={stores} employees={profiles.map(p => ({ id: p.id, displayName: formatEmployeeName(p.lastName, p.firstName, p.middleName), storeId: p.storeId }))} />
      )}

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">Store</label>
          <select name="store" defaultValue={params.store || ''} className="input text-sm">
            <option value="">All stores</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">From</label>
          <input type="date" name="from" defaultValue={params.from || ''} className="input text-sm" />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input type="date" name="to" defaultValue={params.to || ''} className="input text-sm" />
        </div>
        <button type="submit" className="btn-primary text-sm">Filter</button>
        {(params.store || params.from || params.to) && (
          <a href="/dashboard/timekeeping" className="btn-secondary text-sm">Clear</a>
        )}
      </form>

      {/* FLSA overtime alert */}
      {totalHours > 40 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠ <strong>Overtime alert:</strong> {totalHours.toFixed(1)} total hours in this view.
          FLSA requires 1.5× rate for hours over 40/week (at $7.25/hr TX minimum wage).
        </div>
      )}

      {/* Entries table */}
      {entries.length === 0 ? (
        <div className="card p-10 text-center text-stone-400 text-sm">
          No time entries for the selected period.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Employee</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden md:table-cell">Store</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Clock In</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden sm:table-cell">Clock Out</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Hours</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden lg:table-cell">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-900">{e.employeeName}</td>
                    <td className="px-4 py-3 text-stone-500 hidden md:table-cell">{e.storeName}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {new Date(e.clockInAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs hidden sm:table-cell">
                      {e.clockOutAt
                        ? new Date(e.clockOutAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                        : <span className="badge bg-amber-100 text-amber-700 text-[10px]">Active</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-900">
                      {e.hoursWorked
                        ? `${parseFloat(e.hoursWorked).toFixed(2)}h`
                        : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-xs hidden lg:table-cell capitalize">{e.source}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-200 bg-stone-50">
                  <td colSpan={4} className="px-4 py-3 text-xs text-stone-500">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-stone-900">
                    {totalHours.toFixed(2)}h
                  </td>
                  <td className="hidden lg:table-cell" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
