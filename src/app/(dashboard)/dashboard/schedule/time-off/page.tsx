import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getTimeOffRequests } from '@/actions/time-off'
import { TIME_OFF_TYPE_LABELS, TIME_OFF_STATUS_LABELS } from '@/lib/schedule-types'
import type { TimeOffStatus } from '@/lib/schedule-types'
import TimeOffForm from './TimeOffForm'
import { ApproveButton, DenyButton, CancelButton } from './ApproveButtons'

export const metadata: Metadata = { title: 'Time Off Requests' }

const STATUS_BADGE: Record<TimeOffStatus, string> = {
  pending:  'bg-amber-100  text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  denied:   'bg-red-100    text-red-700',
}

export default async function TimeOffPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; profile?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const isManager = hasMinimumRole(user.role, 'manager')
  const params     = await searchParams
  const filterStatus  = params.status  || ''
  const filterProfile = isManager ? (params.profile || '') : ''

  const result = await getTimeOffRequests({
    status:    filterStatus  || undefined,
    profileId: filterProfile || undefined,
  })

  const requests = result.success ? result.data : []

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    })

  const statusOptions: Array<{ value: string; label: string }> = [
    { value: '',         label: 'All statuses' },
    { value: 'pending',  label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'denied',   label: 'Denied' },
  ]

  // Pending count for the alert banner
  const pendingCount = isManager ? requests.filter(r => r.status === 'pending').length : 0

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard/schedule" className="text-xs text-stone-400 hover:text-terracotta mb-1 inline-block">
            ← Back to Schedule
          </Link>
          <h1 className="page-title">Time Off Requests</h1>
        </div>
        <TimeOffForm />
      </div>

      {/* ── Pending alert (manager view) ────────────────────────────────── */}
      {isManager && pendingCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{pendingCount} request{pendingCount > 1 ? 's' : ''}</strong> pending your review.
        </div>
      )}

      {/* ── Status filter ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {statusOptions.map(opt => (
          <Link
            key={opt.value}
            href={`/dashboard/schedule/time-off${opt.value ? `?status=${opt.value}` : ''}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filterStatus === opt.value
                ? 'bg-terracotta text-white border-terracotta'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* ── Requests table ──────────────────────────────────────────────── */}
      {requests.length === 0 ? (
        <div className="card p-8 text-center text-stone-400 text-sm">
          No time-off requests{filterStatus ? ` with status "${filterStatus}"` : ''}.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                {isManager && (
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">
                    Employee
                  </th>
                )}
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Dates</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Days</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Note</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-stone-50/50">
                  {isManager && (
                    <td className="px-4 py-3 font-medium text-stone-900">
                      {req.profileName}
                    </td>
                  )}
                  <td className="px-4 py-3 text-stone-700">
                    {TIME_OFF_TYPE_LABELS[req.type]}
                  </td>
                  <td className="px-4 py-3 text-stone-600 whitespace-nowrap">
                    {fmtDate(req.dateStart)}
                    {req.dateStart !== req.dateEnd && (
                      <> – {fmtDate(req.dateEnd)}</>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700 font-medium">
                    {req.totalDays}d
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge text-[10px] uppercase ${STATUS_BADGE[req.status]}`}>
                      {TIME_OFF_STATUS_LABELS[req.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-400 text-xs max-w-[160px] truncate" title={req.note ?? ''}>
                    {req.note ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* Manager actions on pending requests */}
                      {isManager && req.status === 'pending' && (
                        <>
                          <ApproveButton id={req.id} />
                          <DenyButton    id={req.id} />
                        </>
                      )}
                      {/* Anyone can cancel their own pending request */}
                      {req.profileId === user.id && req.status === 'pending' && (
                        <CancelButton id={req.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Info note ───────────────────────────────────────────────────── */}
      <p className="text-xs text-stone-400">
        After approving a request, mark the days on the{' '}
        <Link href="/dashboard/schedule" className="underline hover:text-terracotta">schedule grid</Link>
        {' '}using the Vacation or Sick type.
      </p>
    </div>
  )
}
