import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import EmployeeDateForm from './EmployeeDateForm'

export const metadata: Metadata = { title: 'Employees' }

const ROLE_BADGE: Record<string, string> = {
  owner:   'bg-gold/20 text-yellow-800',
  manager: 'bg-blue-100 text-blue-800',
  staff:   'bg-stone-100 text-stone-600',
}

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toInputDate(d: Date | null | undefined): string | null {
  if (!d) return null
  return d instanceof Date ? d.toISOString().slice(0, 10) : null
}

// Days until a date (negative = already expired)
function daysUntil(d: Date | null | undefined): number | null {
  if (!d) return null
  return Math.floor((new Date(d).getTime() - Date.now()) / 86_400_000)
}

function CertBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-stone-300 text-xs">—</span>
  if (days < 0)   return <span className="badge bg-red-100 text-red-700 text-[10px]">Expired</span>
  if (days <= 30) return <span className="badge bg-amber-100 text-amber-700 text-[10px]">Exp {days}d</span>
  return <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">Valid</span>
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; status?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')

  const params = await searchParams
  const filterStore  = params.store  || ''
  const filterStatus = params.status || 'active'

  const [profiles, stores] = await Promise.all([
    prisma.profile.findMany({
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
      include: { store: true },
    }),
    prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const filtered = profiles.filter(p => {
    if (filterStore && p.storeId !== filterStore) return false
    const isActive = !p.exitDate || new Date(p.exitDate) >= today
    if (filterStatus === 'active'   && !isActive) return false
    if (filterStatus === 'inactive' && isActive)  return false
    return true
  })

  const isOwner   = user.role === 'owner'
  const isManager = hasMinimumRole(user.role, 'manager')

  // Summary stats for compliance
  type P = typeof profiles[number] & {
    firstName?: string | null; lastName?: string | null; middleName?: string | null
    position?: string | null; phone?: string | null; employeeNumber?: string | null; payType?: string | null
    emergencyContactName?: string | null; emergencyContactPhone?: string | null; emergencyContactRelation?: string | null
    foodHandlerCertExpiry?: Date | null; i9Verified?: boolean; i9VerificationDate?: Date | null
  }

  const expiredCerts = (profiles as P[]).filter(p => {
    const d = p.foodHandlerCertExpiry
    return d && new Date(d) < today
  }).length

  const expiringSoon = (profiles as P[]).filter(p => {
    const days = daysUntil((p as P).foodHandlerCertExpiry)
    return days !== null && days >= 0 && days <= 30
  }).length

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">Employees</h1>
        <p className="text-sm text-stone-500 mt-1">
          {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
          {filterStatus === 'active' ? ' · Active' : filterStatus === 'inactive' ? ' · Inactive / Former' : ''}
        </p>
      </div>

      {/* ── Compliance alerts ───────────────────────────────────────────── */}
      {(expiredCerts > 0 || expiringSoon > 0) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex gap-2 items-start">
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>
            {expiredCerts > 0 && <strong>{expiredCerts} food handler cert{expiredCerts > 1 ? 's' : ''} expired. </strong>}
            {expiringSoon > 0 && <>{expiringSoon} cert{expiringSoon > 1 ? 's' : ''} expiring within 30 days.</>}
            {' '}TX HSC §437.0241 requires valid certification for all food handlers.
          </span>
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">Store</label>
          <select name="store" defaultValue={filterStore} className="input text-sm">
            <option value="">All stores</option>
            {stores.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Status</label>
          <select name="status" defaultValue={filterStatus} className="input text-sm">
            <option value="active">Active</option>
            <option value="inactive">Inactive / Former</option>
            <option value="all">All</option>
          </select>
        </div>
        <button type="submit" className="btn-primary text-sm">Filter</button>
        {(filterStore || filterStatus !== 'active') && (
          <a href="/dashboard/employees" className="btn-secondary text-sm">Clear</a>
        )}
      </form>

      {/* ── Employee list ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-stone-400 text-sm">
          No employees match the selected filters.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-terracotta/20 bg-terracotta/10">
                  <th className="text-left px-4 py-3 font-medium text-stone-800 text-xs uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-800 text-xs uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-800 text-xs uppercase tracking-wide hidden lg:table-cell">Position</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-800 text-xs uppercase tracking-wide hidden md:table-cell">Store</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-800 text-xs uppercase tracking-wide hidden sm:table-cell">Hire Date</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-800 text-xs uppercase tracking-wide hidden xl:table-cell">Food Cert</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-800 text-xs uppercase tracking-wide hidden xl:table-cell">I-9</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-800 text-xs uppercase tracking-wide">Status</th>
                  {isManager && (
                    <th className="text-left px-4 py-3 font-medium text-stone-800 text-xs uppercase tracking-wide">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map(profile => {
                  const p = profile as P
                  const isActive = !p.exitDate || new Date(p.exitDate) >= today
                  const certDays = daysUntil(p.foodHandlerCertExpiry)
                  return (
                    <tr key={p.id} className={`hover:bg-terracotta/5 transition-colors ${!isActive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-stone-500 uppercase">
                              {(p.lastName ?? p.firstName ?? 'U').charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">
                              {(p.lastName || p.firstName)
                                ? formatEmployeeName(p.lastName, p.firstName, p.middleName)
                                : <span className="italic text-stone-400">No name</span>}
                            </p>
                            {p.employeeNumber && (
                              <p className="text-xs text-stone-400">{p.employeeNumber}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge text-[10px] uppercase tracking-wide ${ROLE_BADGE[p.role] ?? 'bg-stone-100 text-stone-600'}`}>
                          {p.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600 hidden lg:table-cell text-xs">
                        {p.position ?? <span className="text-stone-300">—</span>}
                        {p.payType && <span className="ml-1 text-stone-400">({p.payType})</span>}
                      </td>
                      <td className="px-4 py-3 text-stone-600 hidden md:table-cell">
                        {p.store?.name ?? <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-stone-500 hidden sm:table-cell text-xs">
                        {formatDate(p.hireDate)}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <CertBadge days={certDays} />
                        {p.foodHandlerCertExpiry && (
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            {formatDate(p.foodHandlerCertExpiry)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        {p.i9Verified
                          ? <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">Verified</span>
                          : <span className="badge bg-red-100 text-red-700 text-[10px]">Pending</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {isActive ? (
                          <span className="badge bg-emerald-100 text-emerald-700 text-[10px] uppercase tracking-wide">Active</span>
                        ) : (
                          <span className="badge bg-stone-100 text-stone-500 text-[10px] uppercase tracking-wide">Inactive</span>
                        )}
                      </td>
                      {isManager && (
                        <td className="px-4 py-3">
                          <EmployeeDateForm
                            userId={p.id}
                            hireDate={toInputDate(p.hireDate)}
                            exitDate={toInputDate(p.exitDate)}
                            position={p.position ?? null}
                            employeeNumber={p.employeeNumber ?? null}
                            payType={p.payType ?? null}
                            phone={p.phone ?? null}
                            emergencyContactName={p.emergencyContactName ?? null}
                            emergencyContactPhone={p.emergencyContactPhone ?? null}
                            emergencyContactRelation={p.emergencyContactRelation ?? null}
                            foodHandlerCertExpiry={toInputDate(p.foodHandlerCertExpiry)}
                            i9Verified={p.i9Verified ?? false}
                            i9VerificationDate={toInputDate(p.i9VerificationDate)}
                          />
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Summary stats ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',         value: profiles.length,                                                       color: 'text-stone-900' },
          { label: 'Active',        value: profiles.filter(p => !p.exitDate || new Date(p.exitDate) >= today).length, color: 'text-emerald-700' },
          { label: 'Inactive',      value: profiles.filter(p => !!p.exitDate && new Date(p.exitDate) < today).length, color: 'text-stone-400' },
          { label: 'Cert alerts',   value: expiredCerts + expiringSoon,                                           color: expiredCerts > 0 ? 'text-red-600' : expiringSoon > 0 ? 'text-amber-600' : 'text-stone-900' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-stone-400 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

    </div>
  )
}
