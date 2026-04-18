import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'
import { getProducts } from '@/actions/inventory'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: 'Stock Movements' }

const REASON_LABEL: Record<string, string> = {
  received:         'Received',
  sold:             'Sold',
  adjustment:       'Adjustment',
  spoilage:         'Spoilage',
  theft:            'Theft / Shrinkage',
  return:           'Customer Return',
  count_correction: 'Count Correction',
}

const REASONS = Object.entries(REASON_LABEL)

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string
    dateFrom?: string
    dateTo?:   string
    reason?:   string
    store?:    string | string[]
  }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')

  const params = await searchParams

  // Date filter helpers
  const dateFrom = params.dateFrom ? new Date(params.dateFrom + 'T00:00:00Z') : undefined
  const dateTo   = params.dateTo   ? new Date(params.dateTo   + 'T23:59:59Z') : undefined

  // Store multi-select — normalise to string[]
  const selectedStores: string[] = params.store
    ? (Array.isArray(params.store) ? params.store : [params.store])
    : []

  const [entries, productsResult, stores] = await Promise.all([
    prisma.stockLedger.findMany({
      where: {
        ...(params.product  && { productId: params.product }),
        ...(params.reason   && { reason:    params.reason }),
        ...(selectedStores.length > 0 && {
          product: { storeId: { in: selectedStores } },
        }),
        ...(dateFrom || dateTo ? {
          createdAt: {
            ...(dateFrom && { gte: dateFrom }),
            ...(dateTo   && { lte: dateTo   }),
          },
        } : {}),
      },
      include: { product: { select: { name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
      take:    500,
    }),
    getProducts(),
    prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  // Build user name map from profiles
  const uniqueIds = [...new Set(entries.map((e) => e.performedBy))]
  const profiles  = await prisma.profile.findMany({
    where:  { id: { in: uniqueIds } },
    select: { id: true, firstName: true, lastName: true, middleName: true },
  })
  const nameMap = new Map(profiles.map((p) => [p.id, formatEmployeeName(p.lastName, p.firstName, p.middleName)]))

  const products = productsResult.success ? productsResult.data : []

  // Build CSV query string (mirrors current filters)
  const csvQ = new URLSearchParams()
  if (params.product)  csvQ.set('product',  params.product)
  if (params.dateFrom) csvQ.set('dateFrom', params.dateFrom)
  if (params.dateTo)   csvQ.set('dateTo',   params.dateTo)
  if (params.reason)   csvQ.set('reason',   params.reason)
  selectedStores.forEach(s => csvQ.append('store', s))

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
            <Link href="/dashboard/reports" className="hover:text-stone-600">Reports</Link>
            <span>/</span>
            <span>Stock Movements</span>
          </div>
          <h1 className="page-title">Stock Movements</h1>
          <p className="text-sm text-stone-500 mt-1">
            {entries.length === 500 ? 'Showing latest 500 entries' : `${entries.length} entr${entries.length !== 1 ? 'ies' : 'y'}`}
            {(params.product || params.dateFrom || params.dateTo || params.reason) && ' (filtered)'}
          </p>
        </div>
        <a
          href={`/api/reports/movements${csvQ.size > 0 ? `?${csvQ}` : ''}`}
          className="btn-secondary text-sm shrink-0"
          download
        >
          ↓ Download CSV
        </a>
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <form method="GET" className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">Product</label>
          <select name="product" defaultValue={params.product ?? ''} className="input text-sm">
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>[{p.sku}] {p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label text-xs">Reason</label>
          <select name="reason" defaultValue={params.reason ?? ''} className="input text-sm">
            <option value="">All reasons</option>
            {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">From</label>
          <input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ''} className="input text-sm" />
        </div>
        <div>
          <label className="label text-xs">To</label>
          <input type="date" name="dateTo" defaultValue={params.dateTo ?? ''} className="input text-sm" />
        </div>
        {/* Store multi-select */}
        <div>
          <label className="label text-xs">Store</label>
          <div className="flex flex-col gap-1 mt-0.5">
            {stores.map(s => (
              <label key={s.id} className="flex items-center gap-1.5 text-sm text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  name="store"
                  value={s.id}
                  defaultChecked={selectedStores.includes(s.id)}
                  className="rounded border-stone-300 text-terracotta focus:ring-terracotta"
                />
                {s.name}
              </label>
            ))}
          </div>
        </div>
        <button type="submit" className="btn-primary text-sm">Filter</button>
        {(params.product || params.reason || params.dateFrom || params.dateTo || selectedStores.length > 0) && (
          <Link href="/dashboard/reports/movements" className="btn-secondary text-sm">Clear</Link>
        )}
      </form>

      {/* ── Table ───────────────────────────────────────────────────── */}
      {entries.length === 0 ? (
        <div className="card p-12 text-center text-stone-400 text-sm">
          No entries match the selected filters.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Date / Time</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Product</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Change</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden sm:table-cell">Reason</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden md:table-cell">Note</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden lg:table-cell">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {entries.map((e) => {
                  const qty   = Number(e.changeQty)
                  const isIn  = qty > 0
                  const date  = e.createdAt
                  return (
                    <tr key={e.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-stone-500 whitespace-nowrap">
                        <span className="block">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span className="block text-stone-400">{date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-900">{e.product.name}</p>
                        <p className="text-xs text-stone-400 font-mono">{e.product.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold tabular-nums ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                          {isIn ? '+' : ''}{qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(3)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600 hidden sm:table-cell">
                        {REASON_LABEL[e.reason] ?? e.reason}
                      </td>
                      <td className="px-4 py-3 text-stone-400 text-xs hidden md:table-cell">
                        {e.note ?? <span className="text-stone-200">—</span>}
                      </td>
                      <td className="px-4 py-3 text-stone-500 text-xs hidden lg:table-cell">
                        {nameMap.get(e.performedBy) ?? <span className="font-mono text-stone-300">{e.performedBy.slice(0, 8)}…</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {entries.length === 500 && (
            <p className="text-xs text-stone-400 text-center py-3 border-t border-stone-100">
              Showing latest 500 entries. Use date filters to narrow the range, or download CSV for the full dataset.
            </p>
          )}
        </div>
      )}

    </div>
  )
}
