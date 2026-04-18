import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole, hasModuleAccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPurchaseOrders } from '@/actions/purchase-orders'
import type { POStatus, PORow } from '@/actions/purchase-orders'
import POStatusBadge from '@/components/inventory/POStatusBadge'
import Paginator from '@/components/ui/Paginator'

export const metadata: Metadata = { title: 'Purchase Orders' }

const VALID_PAGE_SIZES = [25, 50, 100, 150, 200]

const STATUS_TABS: { label: string; value: POStatus | '' }[] = [
  { label: 'All',        value: '' },
  { label: 'Draft',      value: 'draft' },
  { label: 'Sent',       value: 'sent' },
  { label: 'In Transit', value: 'shipped' },
  { label: 'Received',   value: 'received' },
  { label: 'Cancelled',  value: 'cancelled' },
]

type SupplierGroup = {
  supplierName: string
  latestDate:   string
  orders:       PORow[]
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?:     string
    supplierId?: string
    dateFrom?:   string
    dateTo?:     string
    page?:       string
    perPage?:    string
  }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')
  if (!hasModuleAccess(user, 'purchase_orders')) redirect('/dashboard')

  const params         = await searchParams
  const statusFilter   = (params.status     ?? '') as POStatus | ''
  const supplierFilter = params.supplierId  ?? ''
  const dateFrom       = params.dateFrom    ?? ''
  const dateTo         = params.dateTo      ?? ''
  const perPage        = VALID_PAGE_SIZES.includes(Number(params.perPage)) ? Number(params.perPage) : 25
  const page           = Math.max(1, Number(params.page) || 1)

  // Where clause for groupBy counts — matches date + supplier but NOT status
  const countsWhere: Record<string, unknown> = {}
  if (supplierFilter) countsWhere.supplierId = supplierFilter
  if (dateFrom || dateTo) {
    countsWhere.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) }              : {}),
      ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59Z') } : {}),
    }
  }

  const [ordersResult, suppliers, statusCounts] = await Promise.all([
    getPurchaseOrders({
      status:     statusFilter  || undefined,
      supplierId: supplierFilter || undefined,
      dateFrom:   dateFrom      || undefined,
      dateTo:     dateTo        || undefined,
    }),
    prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      select:  { id: true, name: true },
    }),
    prisma.purchaseOrder.groupBy({
      by:    ['status'],
      where: countsWhere as never,
      _count: { id: true },
    }),
  ])

  const orders = ordersResult.success ? ordersResult.data : []

  // Build per-status counts from groupBy (respects date + supplier filter)
  const countsByStatus: Record<string, number> = {}
  let totalCount = 0
  for (const row of statusCounts) {
    countsByStatus[row.status] = row._count.id
    totalCount += row._count.id
  }
  const counts: Record<string, number> = {
    '':        totalCount,
    draft:     countsByStatus['draft']     ?? 0,
    sent:      countsByStatus['sent']      ?? 0,
    shipped:   countsByStatus['shipped']   ?? 0,
    received:  countsByStatus['received']  ?? 0,
    cancelled: countsByStatus['cancelled'] ?? 0,
  }

  // Preserves date + supplier + perPage when switching status tabs; resets to page 1
  function tabHref(status: POStatus | '') {
    const sp = new URLSearchParams()
    if (status)         sp.set('status',     status)
    if (supplierFilter) sp.set('supplierId', supplierFilter)
    if (dateFrom)       sp.set('dateFrom',   dateFrom)
    if (dateTo)         sp.set('dateTo',     dateTo)
    if (perPage !== 25) sp.set('perPage',    String(perPage))
    const q = sp.toString()
    return `/dashboard/inventory/purchase-orders${q ? '?' + q : ''}`
  }

  function buildHref(p: number, pp: number) {
    const sp = new URLSearchParams()
    if (statusFilter)   sp.set('status',     statusFilter)
    if (supplierFilter) sp.set('supplierId', supplierFilter)
    if (dateFrom)       sp.set('dateFrom',   dateFrom)
    if (dateTo)         sp.set('dateTo',     dateTo)
    if (p > 1)          sp.set('page',       String(p))
    if (pp !== 25)      sp.set('perPage',    String(pp))
    const q = sp.toString()
    return `/dashboard/inventory/purchase-orders${q ? '?' + q : ''}`
  }

  const hasFilters  = supplierFilter || dateFrom || dateTo
  const clearHref   = tabHref(statusFilter)
  const totalOrders = orders.length
  const safePage    = Math.min(page, Math.max(1, Math.ceil(totalOrders / perPage)) || 1)
  const paginated   = orders.slice((safePage - 1) * perPage, safePage * perPage)

  // Group by supplier; action returns orders sorted createdAt desc,
  // so first order per supplier IS the latest — latestDate set on first insert.
  const groupMap = new Map<string, SupplierGroup>()
  for (const order of paginated) {
    const existing = groupMap.get(order.supplierId)
    if (existing) {
      existing.orders.push(order)
    } else {
      groupMap.set(order.supplierId, {
        supplierName: order.supplierName,
        latestDate:   order.createdAt,
        orders:       [order],
      })
    }
  }
  const supplierGroups = [...groupMap.values()]
    .sort((a, b) => b.latestDate.localeCompare(a.latestDate))

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="text-sm text-stone-500 mt-1">Track orders from draft through delivery</p>
        </div>
        <Link href="/dashboard/inventory/purchase-orders/new" className="btn-primary text-sm">
          + New Order
        </Link>
      </div>

      {/* ── Status tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <Link
            key={tab.value}
            href={tabHref(tab.value)}
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

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <form method="GET" className="card p-4 flex flex-wrap gap-4 items-end">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}

        <div>
          <label className="label text-xs">Supplier</label>
          <select name="supplierId" defaultValue={supplierFilter} className="input text-xs h-8 py-0">
            <option value="">All suppliers</option>
            {suppliers.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label text-xs">From</label>
          <input type="date" name="dateFrom" defaultValue={dateFrom} className="input text-xs h-8 py-0" />
        </div>

        <div>
          <label className="label text-xs">To</label>
          <input type="date" name="dateTo" defaultValue={dateTo} className="input text-xs h-8 py-0" />
        </div>

        {/* Preserve perPage; filter always resets to page 1 */}
        {perPage !== 25 && <input type="hidden" name="perPage" value={perPage} />}

        <div className="flex items-center gap-2">
          <button type="submit" className="btn-primary text-xs py-1.5 px-3">Filter</button>
          {hasFilters && (
            <Link href={clearHref} className="text-xs text-stone-400 hover:text-stone-700">Clear</Link>
          )}
        </div>
      </form>

      {/* ── Grouped order list ──────────────────────────────────────────── */}
      {supplierGroups.length === 0 ? (
        <div className="card p-10 text-center text-stone-400 text-sm">
          No purchase orders found.{' '}
          <Link href="/dashboard/inventory/purchase-orders/new" className="text-terracotta hover:underline">
            Create one
          </Link>
        </div>
      ) : (
        <div className="space-y-6 [&>*:last-child]:mb-0">
          {supplierGroups.map(group => (
            <div key={group.supplierName}>

              {/* Supplier heading */}
              <div className="flex items-baseline justify-between gap-2 px-1 mb-2">
                <h2 className="text-sm font-semibold text-stone-700">{group.supplierName}</h2>
                <span className="text-xs text-stone-400">
                  {group.orders.length} order{group.orders.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Orders within this supplier */}
              <div className="card divide-y divide-stone-100">
                {group.orders.map(order => (
                  <div key={order.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {order.poNumber && (
                          <span className="text-sm font-medium text-stone-900 font-mono">
                            {order.poNumber}
                          </span>
                        )}
                        <POStatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                        {' · '}{fmtDate(order.createdAt)}
                        {order.status === 'shipped' && order.trackingRef && ` · Tracking: ${order.trackingRef}`}
                        {order.status === 'shipped' && order.expectedAt  && ` · Expected ${order.expectedAt}`}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/inventory/purchase-orders/${order.id}`}
                      className="btn-secondary text-xs px-3 py-1.5 shrink-0"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>

            </div>
          ))}

          <Paginator
            page={safePage}
            perPage={perPage}
            total={totalOrders}
            buildHref={buildHref}
            noun="orders"
          />
        </div>
      )}

    </div>
  )
}
