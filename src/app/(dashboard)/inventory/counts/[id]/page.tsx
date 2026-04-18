import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getInventoryCount } from '@/actions/inventory-count'
import CountSheet from './CountSheet'

export const metadata: Metadata = { title: 'Count Sheet' }

export default async function CountSheetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard/inventory')

  const { id } = await params
  const result = await getInventoryCount(id)

  if (!result.success) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <p className="text-red-600">{result.error}</p>
        <Link href="/dashboard/inventory/counts" className="text-sm text-terracotta hover:underline mt-2 block">
          ← Back to counts
        </Link>
      </div>
    )
  }

  const { count, items } = result.data

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl space-y-6">

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard/inventory/counts" className="text-xs text-stone-400 hover:text-stone-600">
            ← Inventory Counts
          </Link>
          <h1 className="page-title mt-1">{count.storeName} — Count Sheet</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {new Date(count.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {count.notes && <> · {count.notes}</>}
          </p>
        </div>
        <span className={`badge text-xs uppercase tracking-wide mt-1 ${count.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {count.status}
        </span>
      </div>

      <CountSheet
        countId={count.id}
        items={items}
        isReadOnly={count.status === 'completed'}
      />
    </div>
  )
}
