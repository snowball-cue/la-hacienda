import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole, hasModuleAccess } from '@/lib/auth'
import { getPayrollPeriods } from '@/actions/payroll'

export const metadata: Metadata = { title: 'Payroll' }

const STATUS_BADGE: Record<string, string> = {
  open:   'bg-blue-100 text-blue-800',
  closed: 'bg-emerald-100 text-emerald-800',
}

export default async function PayrollPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')
  if (!hasModuleAccess(user, 'payroll')) redirect('/dashboard')

  const result  = await getPayrollPeriods()
  const periods = result.success ? result.data : []

  const isOwner = user.role === 'owner'

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="text-sm text-stone-500 mt-1">Pay periods and hours export</p>
        </div>
        {isOwner && (
          <Link href="/dashboard/payroll/new" className="btn-primary text-sm">
            + New Period
          </Link>
        )}
      </div>

      {/* ── Period list ─────────────────────────────────────────────────── */}
      {periods.length === 0 ? (
        <div className="card p-10 text-center text-stone-400 text-sm">
          <p className="font-medium text-stone-500 mb-1">No pay periods yet</p>
          {isOwner
            ? <p>Click <strong>+ New Period</strong> to create your first pay period.</p>
            : <p>The owner hasn&apos;t created any pay periods yet.</p>
          }
        </div>
      ) : (
        <div className="card divide-y divide-stone-100">
          {periods.map(p => (
            <div key={p.id} className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900">
                  {new Date(p.periodStart + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                  {' – '}
                  {new Date(p.periodEnd + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                </p>
                <p className="text-xs text-stone-400 mt-0.5 capitalize">{p.frequency} · {p.entryCount} entr{p.entryCount === 1 ? 'y' : 'ies'}</p>
              </div>
              <span className={`badge text-[10px] uppercase tracking-wide ${STATUS_BADGE[p.status] ?? 'bg-stone-100 text-stone-600'}`}>
                {p.status}
              </span>
              <Link
                href={`/dashboard/payroll/${p.id}`}
                className="btn-secondary text-xs px-3 py-1.5 shrink-0"
              >
                View →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* ── Export info ─────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600 space-y-1">
        <p className="font-medium text-stone-700">Exporting for your accountant</p>
        <p>Each pay period has CSV and XLSX download buttons. The export includes employee name, regular hours, overtime hours, hourly rate, and gross pay — formatted for QuickBooks, Gusto, ADP, or any payroll processor.</p>
        <p className="text-stone-500">Texas overtime rule (FLSA): hours over 40 per workweek are paid at 1.5× rate. For bi-weekly periods, overtime is computed per week independently.</p>
      </div>
    </div>
  )
}
