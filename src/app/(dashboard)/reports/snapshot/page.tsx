import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getCategories } from '@/actions/inventory'
import { prisma } from '@/lib/prisma'



export const metadata: Metadata = { title: 'Inventory Snapshot' }

const UNIT_LABEL: Record<string, string> = {
  each: 'ea', lb: 'lb', kg: 'kg', case: 'case', oz: 'oz', dozen: 'doz', bag: 'bag',
}

export default async function SnapshotPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; store?: string | string[] }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')

  const params     = await searchParams
  const categories = await getCategories()

  const selectedStores: string[] = params.store
    ? (Array.isArray(params.store) ? params.store : [params.store])
    : []

  const [products, stockGroups, stores] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        ...(params.category && { categoryId: params.category }),
        ...(selectedStores.length > 0 && { storeId: { in: selectedStores } }),
      },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    }),
    prisma.stockLedger.groupBy({
      by:   ['productId'],
      _sum: { changeQty: true },
    }),
    prisma.store.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const stockMap = new Map(stockGroups.map((g) => [g.productId, Number(g._sum.changeQty ?? 0)]))

  const rows = products.map((p) => {
    const currentStock = stockMap.get(p.id) ?? 0
    const cost         = p.costPrice  != null ? Number(p.costPrice)  : null
    const sell         = p.sellPrice  != null ? Number(p.sellPrice)  : null
    return {
      ...p,
      currentStock,
      costValue: cost  != null ? currentStock * cost  : null,
      sellValue: sell  != null ? currentStock * sell  : null,
    }
  })

  const totalCost = rows.reduce((s, r) => s + (r.costValue ?? 0), 0)
  const totalSell = rows.reduce((s, r) => s + (r.sellValue ?? 0), 0)
  const csvQ = new URLSearchParams()
  if (params.category) csvQ.set('category', params.category)
  selectedStores.forEach(s => csvQ.append('store', s))
  const csvParams = csvQ.size > 0 ? `?${csvQ}` : ''
  const asOf = new Date().toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-stone-400 mb-2">
            <Link href="/dashboard/reports" className="hover:text-stone-600">Reports</Link>
            <span>/</span>
            <span>Snapshot</span>
          </div>
          <h1 className="page-title">Inventory Snapshot</h1>
          <p className="text-sm text-stone-500 mt-1">As of {asOf}</p>
        </div>
        <a
          href={`/api/reports/snapshot${csvParams}`}
          className="btn-secondary text-sm shrink-0"
          download
        >
          ↓ Download CSV
        </a>
      </div>

      {/* ── Value summary ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">{rows.length}</p>
          <p className="text-xs text-stone-500 mt-0.5">Active SKUs</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">${totalCost.toFixed(2)}</p>
          <p className="text-xs text-stone-500 mt-0.5">Total Cost Value</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-forest">${totalSell.toFixed(2)}</p>
          <p className="text-xs text-stone-500 mt-0.5">Total Sell Value</p>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <form method="GET" className="card p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="label text-xs">Category</label>
          <select name="category" defaultValue={params.category ?? ''} className="input text-sm">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
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
        {(params.category || selectedStores.length > 0) && (
          <Link href="/dashboard/reports/snapshot" className="btn-secondary text-sm">Clear</Link>
        )}
      </form>

      {/* ── Table ───────────────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="card p-12 text-center text-stone-400 text-sm">No products match the selected filter.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">SKU</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Stock</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden sm:table-cell">Cost/Unit</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden sm:table-cell">Sell/Unit</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Cost Value</th>
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden lg:table-cell">Sell Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">{p.sku}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{p.name}</p>
                      {p.nameEs && <p className="text-xs text-stone-400 italic">{p.nameEs}</p>}
                    </td>
                    <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{p.category.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={`font-semibold ${p.currentStock <= p.reorderPoint ? 'text-amber-600' : 'text-stone-900'}`}>
                        {p.currentStock % 1 === 0 ? p.currentStock : p.currentStock.toFixed(2)}
                      </span>
                      <span className="text-xs text-stone-400 ml-1">{UNIT_LABEL[p.unit] ?? p.unit}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-stone-500 tabular-nums hidden sm:table-cell">
                      {p.costPrice != null ? `$${Number(p.costPrice).toFixed(2)}` : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-500 tabular-nums hidden sm:table-cell">
                      {p.sellPrice != null ? `$${Number(p.sellPrice).toFixed(2)}` : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {p.costValue != null
                        ? <span className="font-medium text-stone-900">${p.costValue.toFixed(2)}</span>
                        : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-forest tabular-nums hidden lg:table-cell">
                      {p.sellValue != null ? `$${p.sellValue.toFixed(2)}` : <span className="text-stone-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-stone-200 bg-stone-50">
                  <td colSpan={6} className="px-4 py-3 text-right text-xs font-semibold text-stone-500 uppercase tracking-wide hidden sm:table-cell">
                    Totals
                  </td>
                  <td colSpan={4} className="px-4 py-3 text-right text-xs font-semibold text-stone-500 uppercase tracking-wide sm:hidden">
                    Totals
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-stone-900 tabular-nums">${totalCost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-bold text-forest tabular-nums hidden lg:table-cell">${totalSell.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
