import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getAuthUser, hasMinimumRole, hasModuleAccess } from '@/lib/auth'
import { getPayrollDetail } from '@/actions/payroll'
import { closePayrollPeriod } from '@/actions/payroll'
import PayrollEntryForm from './PayrollEntryForm'

export const metadata: Metadata = { title: 'Pay Period' }

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')
  if (!hasModuleAccess(user, 'payroll')) redirect('/dashboard')

  const { id } = await params
  const result = await getPayrollDetail(id)
  if (!result.success) notFound()
  const { period, rows } = result.data

  const isOwner  = user.role === 'owner'
  const isClosed = period.status === 'closed'

  const totalRegular  = rows.reduce((s, r) => s + r.regularHours,  0)
  const totalOvertime = rows.reduce((s, r) => s + r.overtimeHours, 0)
  const totalGross    = rows.reduce((s, r) => s + (r.grossPay ? Number(r.grossPay) : 0), 0)

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard/payroll" className="text-xs text-stone-400 hover:text-terracotta mb-1 inline-block">
            ← All periods
          </Link>
          <h1 className="page-title">
            {fmtDate(period.periodStart)} – {fmtDate(period.periodEnd)}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`badge text-[10px] uppercase ${isClosed ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
              {period.status}
            </span>
            <span className="text-xs text-stone-400 capitalize">{period.frequency}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV download */}
          <a
            href={`/api/payroll/${id}?format=csv`}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Download CSV
          </a>
          {/* XLSX download */}
          <a
            href={`/api/payroll/${id}?format=xlsx`}
            className="btn-secondary text-xs px-3 py-1.5"
          >
            Download XLSX
          </a>
          {/* Close period — owner only, open periods only */}
          {isOwner && !isClosed && (
            <form action={async () => { 'use server'; await closePayrollPeriod(id) }}>
              <button type="submit" className="btn-primary text-xs px-3 py-1.5">
                Close Period
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── Summary row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Total Regular Hrs</p>
          <p className="text-2xl font-bold text-stone-900">{totalRegular.toFixed(1)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Total Overtime Hrs</p>
          <p className={`text-2xl font-bold ${totalOvertime > 0 ? 'text-amber-700' : 'text-stone-900'}`}>
            {totalOvertime.toFixed(1)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 mb-1">Total Gross Pay</p>
          <p className="text-2xl font-bold text-stone-900">
            {totalGross > 0 ? `$${totalGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </p>
        </div>
      </div>

      {/* ── Employee hours table ─────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Employee</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Sched.</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Actual</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Regular</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">OT</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Rate</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Gross</th>
              {!isClosed && (
                <th className="px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide" />
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {rows.map(row => (
              <tr key={row.profileId} className="hover:bg-stone-50/50">
                <td className="px-4 py-3 font-medium text-stone-900">{row.profileName}</td>
                <td className="px-4 py-3 text-right text-stone-500">{row.scheduledHours.toFixed(1)}</td>
                <td className="px-4 py-3 text-right">
                  {row.actualHours != null
                    ? <span className="text-amber-700 font-medium">{row.actualHours.toFixed(1)}</span>
                    : <span className="text-stone-300">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-right text-stone-700">{row.regularHours.toFixed(1)}</td>
                <td className="px-4 py-3 text-right">
                  {row.overtimeHours > 0
                    ? <span className="text-amber-700 font-medium">{row.overtimeHours.toFixed(1)}</span>
                    : <span className="text-stone-300">0.0</span>
                  }
                </td>
                <td className="px-4 py-3 text-right text-stone-500">
                  {row.hourlyRate ? `$${row.hourlyRate}` : <span className="text-stone-300">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-medium text-stone-900">
                  {row.grossPay
                    ? `$${Number(row.grossPay).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : <span className="text-stone-300">—</span>
                  }
                </td>
                {!isClosed && (
                  <td className="px-4 py-3">
                    <PayrollEntryForm
                      periodId={id}
                      profileId={row.profileId}
                      profileName={row.profileName}
                      currentActualHours={row.actualHours}
                      currentHourlyRate={row.hourlyRate}
                      currentNote={row.note}
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isClosed && (
        <p className="text-xs text-stone-400 text-center">
          This period is closed. Download the export above to share with your accountant.
        </p>
      )}
    </div>
  )
}
