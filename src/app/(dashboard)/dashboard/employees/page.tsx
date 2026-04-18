import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole, hasModuleAccess } from '@/lib/auth'
import { getEmployees } from '@/actions/employees'
import { getSelectedStoreIds } from '@/lib/store-filter'
import { prisma } from '@/lib/prisma'
import SortableHeader from '@/components/ui/SortableHeader'
import EmployeeModal from './EmployeeModal'
import ReactivateButton from './ReactivateButton'

export const metadata: Metadata = { title: 'Employees' }

const SORT_FIELDS = ['lastName', 'position', 'phone', 'storeName', 'hireDate', 'isActive'] as const
type SortField = typeof SORT_FIELDS[number]

function isSortField(s: string | undefined): s is SortField {
  return SORT_FIELDS.includes(s as SortField)
}

type ShowFilter = 'active' | 'inactive' | 'all'

function isShowFilter(s: string | undefined): s is ShowFilter {
  return s === 'active' || s === 'inactive' || s === 'all'
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; sort?: string; dir?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')
  if (!hasModuleAccess(user, 'employees')) redirect('/dashboard')

  const params = await searchParams
  const show   = isShowFilter(params.show) ? params.show : 'active'
  const sort   = isSortField(params.sort) ? params.sort : 'lastName'
  const dir    = params.dir === 'desc' ? 'desc' : 'asc'

  const [selectedStores, stores, allNums, activeCount, inactiveCount] = await Promise.all([
    getSelectedStoreIds(),
    prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.profile.findMany({ select: { employeeNumber: true } }),
    prisma.profile.count({ where: { isActive: true } }),
    prisma.profile.count({ where: { isActive: false } }),
  ])

  // Compute next EMP-XXX that doesn't collide with any existing number
  const usedNumbers = new Set(allNums.map(p => p.employeeNumber).filter(Boolean))
  let nextSeq = 1
  const existingSeqs = [...usedNumbers]
    .map(n => { const m = n!.match(/^EMP-(\d+)$/i); return m ? parseInt(m[1], 10) : 0 })
    .filter(n => n > 0)
  if (existingSeqs.length) nextSeq = Math.max(...existingSeqs) + 1
  const nextEmployeeNumber = `EMP-${String(nextSeq).padStart(3, '0')}`

  const result = await getEmployees(
    show,
    selectedStores.length ? selectedStores : undefined,
    sort,
    dir,
  )

  const employees = result.success ? result.data : []

  const storeNameById = new Map(stores.map(s => [s.id, s.name]))

  const pathname = '/dashboard/employees'
  const sp = { show: params.show, sort: params.sort, dir: params.dir }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="text-sm text-stone-500 mt-1">
            {activeCount} active · {inactiveCount} inactive
          </p>
        </div>
        <EmployeeModal stores={stores} nextEmployeeNumber={nextEmployeeNumber} />
      </div>

      {/* ── Status tabs ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1 w-fit">
        {([
          { key: 'active',   label: 'Active',   count: activeCount },
          { key: 'inactive', label: 'Inactive', count: inactiveCount },
          { key: 'all',      label: 'All',      count: activeCount + inactiveCount },
        ] as const).map(tab => {
          const isActive = show === tab.key
          const href = `/dashboard/employees?show=${tab.key}${params.sort ? `&sort=${params.sort}` : ''}${params.dir ? `&dir=${params.dir}` : ''}`
          return (
            <a
              key={tab.key}
              href={href}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${isActive ? 'text-stone-500' : 'text-stone-400'}`}>
                {tab.count}
              </span>
            </a>
          )
        })}
      </div>

      {/* ── Privacy notice ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Privacy:</strong> Contact information (email, phone, address) is only visible to managers and owners.
        The schedule grid shows employee names only.
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      {employees.length === 0 ? (
        <div className="card p-8 text-center text-stone-400 text-sm">
          {show === 'inactive'
            ? 'No inactive employees.'
            : 'No employees yet. Use "+ Add Employee" to add your first staff member.'}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <SortableHeader label="Name"       sortKey="lastName"  currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <SortableHeader label="Position"   sortKey="position"  currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Email</th>
                  <SortableHeader label="Phone"      sortKey="phone"     currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <SortableHeader label="Store"      sortKey="storeName" currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <SortableHeader label="Hire Date"  sortKey="hireDate"  currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <SortableHeader label="Status"     sortKey="isActive"  currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {employees.map(emp => (
                  <tr key={emp.id} className={`hover:bg-stone-50 transition-colors ${!emp.isActive && show === 'all' ? 'opacity-50' : ''}`}>

                    {/* Name + emp # */}
                    <td className="px-4 py-3 font-medium text-stone-900">
                      {emp.fullName}
                      {emp.employeeNumber && (
                        <p className="text-[10px] text-stone-400 font-mono font-normal mt-0.5">{emp.employeeNumber}</p>
                      )}
                    </td>

                    {/* Position + pay type */}
                    <td className="px-4 py-3 text-stone-600">
                      {emp.position ?? <span className="text-stone-300">—</span>}
                      {emp.payType && (
                        <span className="ml-1.5 text-[10px] text-stone-400 capitalize">{emp.payType}</span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-stone-600">
                      {emp.email
                        ? <a href={`mailto:${emp.email}`} className="hover:text-terracotta">{emp.email}</a>
                        : <span className="text-stone-300">—</span>}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-stone-600">
                      {emp.phone
                        ? <a href={`tel:${emp.phone}`} className="hover:text-terracotta">{emp.phone}</a>
                        : <span className="text-stone-300">—</span>}
                    </td>

                    {/* Store */}
                    <td className="px-4 py-3 text-stone-600">
                      <div>
                        {emp.storeName
                          ? <span className="font-medium">{emp.storeName}</span>
                          : <span className="text-stone-300">—</span>}
                        {emp.secondaryStoreIds.length > 0 && (
                          <p className="text-xs text-stone-400 mt-0.5">
                            Also: {emp.secondaryStoreIds.map(id => storeNameById.get(id) ?? id).join(', ')}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Hire date + exit */}
                    <td className="px-4 py-3 text-stone-600 text-xs">
                      {emp.hireDate
                        ? new Date(emp.hireDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
                        : <span className="text-stone-300">—</span>}
                      {emp.exitDate && (
                        <p className="text-stone-400 mt-0.5" title={emp.exitReason ?? undefined}>
                          Left {new Date(emp.exitDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                          {emp.exitReason && ` · ${emp.exitReason.replace('_', ' ')}`}
                        </p>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className={`badge text-[10px] uppercase ${emp.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                        {emp.foodHandlerCertExpiry && (() => {
                          const exp = new Date(emp.foodHandlerCertExpiry + 'T00:00:00Z')
                          const daysLeft = Math.ceil((exp.getTime() - Date.now()) / 86400000)
                          if (daysLeft < 30) {
                            return (
                              <p className={`text-[10px] ${daysLeft < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                                {daysLeft < 0 ? '⚠ Food cert expired' : `⚠ Cert in ${daysLeft}d`}
                              </p>
                            )
                          }
                        })()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <EmployeeModal editEmployee={emp} stores={stores} />
                        {!emp.isActive && <ReactivateButton id={emp.id} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
