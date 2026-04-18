import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPurchaseOrders } from '@/actions/purchase-orders'
import type { POStatus } from '@/actions/purchase-orders'
import POStatusBadge from '@/components/inventory/POStatusBadge'
import SortableHeader from '@/components/ui/SortableHeader'

export const metadata: Metadata = { title: 'Purchase Orders' }

const STATUS_TABS: { label: string; value: POStatus | '' }[] = [
  { label: 'All',        value: '' },
  { label: 'Draft',      value: 'draft' },
  { label: 'Sent',       value: 'sent' },
  { label: 'In Transit', value: 'shipped' },
  { label: 'Received',   value: 'received' },
  { label: 'Cancelled',  value: 'cancelled' },
]

const SORT_FIELDS = ['supplierName', 'poNumber', 'status', 'createdAt', 'expectedAt', 'itemCount'] as const
type SortField = typeof SORT_FIELDS[number]
function isSortField(s: string | undefined): s is SortField {
  return SORT_FIELDS.includes(s as SortField)
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; supplierId?: string; sort?: string; dir?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')

  const params         = await searchParams
  const statusFilter   = (params.status ?? '') as POStatus | ''
  const supplierFilter = params.supplierId ?? ''
  const sort           = isSortField(params.sort) ? params.sort : 'createdAt'
  const dir            = params.dir === 'asc' ? 'asc' : 'desc'   // default newest first

  const [ordersResult, suppliers] = await Promise.all([
    getPurchaseOrders({
      status:     statusFilter  || undefined,
      supplierId: supplierFilter || undefined,
    }),
    prisma.supplier.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const allOrders = ordersResult.success ? ordersResult.data : []

  // Sort client-side
  const orders = [...allOrders].sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sort] ?? ''
    const bVal = (b as unknown as Record<string, unknown>)[sort] ?? ''
    const cmp  = typeof aVal === 'number' && typeof bVal === 'number'
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' })
    return dir === 'asc' ? cmp : -cmp
  })

  // Status counts
  const countResult = await getPurchaseOrders()
  const allForCount = countResult.success ? countResult.data : []
  const counts = {
    '':        allForCount.length,
    draft:     allForCount.filter(o => o.status === 'draft').length,
    sent:      allForCount.filter(o => o.status === 'sent').length,
    shipped:   allForCount.filter(o => o.status === 'shipped').length,
    received:  allForCount.filter(o => o.status === 'received').length,
    cancelled: allForCount.filter(o => o.status === 'cancelled').length,
  } as Record<string, number>

  const pathname = '/dashboard/inventory/purchase-orders'
  const sp = { status: params.status, supplierId: params.supplierId, sort: params.sort, dir: params.dir }

  function tabHref(status: POStatus | '') {
    const p = new URLSearchParams()
    if (status)        p.set('status',     status)
    if (supplierFilter) p.set('supplierId', supplierFilter)
    if (params.sort)   p.set('sort', params.sort)
    if (params.dir)    p.set('dir',  params.dir)
    const q = p.toString()
    return `${pathname}${q ? '?' + q : ''}`
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="text-sm text-stone-500 mt-1">Track orders from draft through delivery</p>
        </div>
        <Link href="/dashboard/inventory/purchase-orders/new" className="btn-primary text-sm">+ New Order</Link>
      </div>

      {/* ── Status tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <Link key={tab.value} href={tabHref(tab.value)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
              statusFilter === tab.value
                ? 'border-terracotta text-terracotta'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            {tab.label}
            <span className="ml-1 text-[10px] text-stone-400">({counts[tab.value] ?? 0})</span>
          </Link>
        ))}
      </div>

      {/* ── Supplier filter ──────────────────────────────────────────────── */}
      <form method="GET" className="flex items-center gap-2">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        {params.sort  && <input type="hidden" name="sort"   value={params.sort} />}
        {params.dir   && <input type="hidden" name="dir"    value={params.dir} />}
        <select name="supplierId" defaultValue={supplierFilter} className="input text-xs h-8 py-0">
          <option value="">All suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="submit" className="btn-secondary text-xs py-1 px-3">Filter</button>
        {supplierFilter && <Link href={tabHref(statusFilter)} className="text-xs text-stone-400 hover:text-stone-700">Clear</Link>}
      </form>

      {/* ── Orders table ─────────────────────────────────────────────────── */}
      {orders.length === 0 ? (
        <div className="card p-10 text-center text-stone-400 text-sm">
          No purchase orders found.{' '}
          <Link href="/dashboard/inventory/purchase-orders/new" className="text-terracotta hover:underline">Create one</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <SortableHeader label="Supplier"    sortKey="supplierName" currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <SortableHeader label="PO #"        sortKey="poNumber"     currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <SortableHeader label="Status"      sortKey="status"       currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <SortableHeader label="Items"       sortKey="itemCount"    currentSort={sort} currentDir={dir} pathname={pathname} params={sp} align="right" />
                  <SortableHeader label="Created"     sortKey="createdAt"    currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <SortableHeader label="Expected"    sortKey="expectedAt"   currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{order.supplierName}</p>
                      {order.trackingRef && (
                        <p className="text-xs text-stone-400 mt-0.5">Tracking: {order.trackingRef}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">
                      {order.poNumber ?? <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <POStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {order.expectedAt
                        ? new Date(order.expectedAt + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
                        : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/inventory/purchase-orders/${order.id}`} className="btn-secondary text-xs px-3 py-1.5">
                        View →
                      </Link>
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
