import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getInventoryCounts } from '@/actions/inventory-count'

export const metadata: Metadata = { title: 'Inventory Counts' }

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
}

export default async function InventoryCountsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard/inventory')

  const result = await getInventoryCounts()
  const counts = result.success ? result.data : []

  return (
    <div className="p-6 lg:p-8 max-w-4xl space-y-6">

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Inventory Counts</h1>
          <p className="text-sm text-stone-500 mt-1">Physical stocktake sessions</p>
        </div>
        <Link href="/dashboard/inventory/counts/new" className="btn-primary text-sm">
          + New Count
        </Link>
      </div>

      {counts.length === 0 ? (
        <div className="card p-12 text-center text-stone-400 text-sm">
          No inventory counts yet.{' '}
          <Link href="/dashboard/inventory/counts/new" className="text-terracotta hover:underline">
            Start your first stocktake
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Store</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden sm:table-cell">Items</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden md:table-cell">Started</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden md:table-cell">Completed</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {counts.map(c => (
                <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-stone-900">{c.storeName}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-[10px] uppercase tracking-wide ${STATUS_BADGE[c.status] ?? 'bg-stone-100 text-stone-500'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 hidden sm:table-cell">{c.itemCount}</td>
                  <td className="px-4 py-3 text-stone-500 hidden md:table-cell text-xs">
                    {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-stone-500 hidden md:table-cell text-xs">
                    {c.completedAt
                      ? new Date(c.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : <span className="text-stone-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/inventory/counts/${c.id}`}
                      className="text-xs text-terracotta hover:underline"
                    >
                      {c.status === 'draft' ? 'Continue →' : 'View →'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
