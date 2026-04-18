import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: 'Low-Stock Report' }

const UNIT_LABEL: Record<string, string> = {
  each: 'ea', lb: 'lb', kg: 'kg', case: 'case', oz: 'oz', dozen: 'doz', bag: 'bag',
}

export default async function LowStockReportPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string | string[] }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')

  const params = await searchParams
  const selectedStores: string[] = params.store
    ? (Array.isArray(params.store) ? params.store : [params.store])
    : []

  // Fetch all active products + stock totals in one pass
  const [products, stockGroups, stores] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        ...(selectedStores.length > 0 && { storeId: { in: selectedStores } }),
      },
      include: { category: true, supplier: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    }),
    prisma.stockLedger.groupBy({
      by:   ['productId'],
      _sum: { changeQty: true },
    }),
    prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const stockMap = new Map(stockGroups.map((g) => [g.productId, Number(g._sum.changeQty ?? 0)]))

  const rows = products
    .map((p) => ({ ...p, currentStock: stockMap.get(p.id) ?? 0 }))
    .filter((p) => p.currentStock <= p.reorderPoint)
    .sort((a, b) => (a.currentStock - a.reorderPoint) - (b.currentStock - b.reorderPoint)) // most urgent first

  const csvQ = new URLSearchParams()
  selectedStores.forEach(s => csvQ.append('store', s))

  const asOf = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
            <Link href="/dashboard/reports" className="hover:text-stone-600">Reports</Link>
            <span>/</span>
            <span>Low-Stock</span>
          </div>
          <h1 className="page-title">Low-Stock Report</h1>
          <p className="text-sm text-stone-500 mt-1">As of {asOf}</p>
        </div>
        <a
          href={`/api/reports/low-stock${csvQ.size > 0 ? `?${csvQ}` : ''}`}
          className="btn-secondary text-sm shrink-0"
          download
        >
          ↓ Download CSV
        </a>
      </div>

      {/* ── Store filter ────────────────────────────────────────────── */}
      <form method="GET" className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="label text-xs">Store</label>
          <div className="flex flex-wrap gap-3">
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
        {selectedStores.length > 0 && (
          <a href="/dashboard/reports/low-stock" className="btn-secondary text-sm">Clear</a>
        )}
      </form>

      {/* ── Summary banner ──────────────────────────────────────────── */}
      {rows.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-semibold">{rows.length} product{rows.length !== 1 ? 's' : ''}</span>
          {' '}at or below reorder point.
          {rows.some((r) => r.currentStock <= 0) && (
            <span className="ml-2 font-semibold text-red-700">
              {rows.filter((r) => r.currentStock <= 0).length} out of stock.
            </span>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 font-medium">
          All products are above their reorder points.
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────── */}
      {rows.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">SKU</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden lg:table-cell">Supplier</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Reorder At</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Shortage</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden sm:table-cell">Order Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((p) => {
                  const shortage   = p.reorderPoint - p.currentStock
                  const outOfStock = p.currentStock <= 0
                  return (
                    <tr key={p.id} className={`${outOfStock ? 'bg-red-50' : 'hover:bg-stone-50'} transition-colors`}>
                      <td className="px-4 py-3 font-mono text-xs text-stone-500">{p.sku}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-900">{p.name}</p>
                        {p.nameEs && <p className="text-xs text-stone-400 italic">{p.nameEs}</p>}
                      </td>
                      <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{p.category.name}</td>
                      <td className="px-4 py-3 text-stone-500 hidden lg:table-cell">
                        {p.supplier?.name ?? <span className="text-stone-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold tabular-nums ${outOfStock ? 'text-red-600' : 'text-amber-600'}`}>
                          {p.currentStock % 1 === 0 ? p.currentStock : p.currentStock.toFixed(2)}
                        </span>
                        <span className="text-xs text-stone-400 ml-1">{UNIT_LABEL[p.unit] ?? p.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-stone-500 tabular-nums">{p.reorderPoint}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-semibold tabular-nums ${outOfStock ? 'text-red-600' : 'text-amber-600'}`}>
                          +{shortage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-stone-500 tabular-nums hidden sm:table-cell">
                        {p.reorderQty > 0 ? p.reorderQty : <span className="text-stone-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
