import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getProducts, getCategories, getStores } from '@/actions/inventory'
import SortableHeader from '@/components/ui/SortableHeader'
import ArchiveButton from './ArchiveButton'

export const metadata: Metadata = { title: 'Inventory' }

const UNIT_LABEL: Record<string, string> = {
  each: 'ea', lb: 'lb', kg: 'kg', case: 'case', oz: 'oz', dozen: 'doz', bag: 'bag',
}

const SORT_FIELDS = ['name', 'sku', 'categoryName', 'storeName', 'currentStock', 'reorderPoint', 'costPrice'] as const
type SortField = typeof SORT_FIELDS[number]
function isSortField(s: string | undefined): s is SortField {
  return SORT_FIELDS.includes(s as SortField)
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; store?: string; filter?: string; sort?: string; dir?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const params  = await searchParams
  const canEdit = hasMinimumRole(user.role, 'manager')
  const isOwner = hasMinimumRole(user.role, 'owner')
  const sort    = isSortField(params.sort) ? params.sort : 'name'
  const dir     = params.dir === 'desc' ? 'desc' : 'asc'

  const [result, categories, stores] = await Promise.all([
    getProducts({
      search:       params.search,
      categoryId:   params.category,
      storeId:      params.store,
      lowStockOnly: params.filter === 'low-stock',
      expiringOnly: params.filter === 'expiring',
    }),
    getCategories(),
    getStores(),
  ])

  const allProducts = result.success ? result.data : []
  const dbError     = !result.success ? result.error : null
  const lowCount    = allProducts.filter(p => p.isLowStock).length

  // Client-side sort (products already loaded)
  const products = [...allProducts].sort((a, b) => {
    const aVal = (a as unknown as Record<string, unknown>)[sort] ?? ''
    const bVal = (b as unknown as Record<string, unknown>)[sort] ?? ''
    const cmp  = typeof aVal === 'number' && typeof bVal === 'number'
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' })
    return dir === 'asc' ? cmp : -cmp
  })

  const pathname = '/dashboard/inventory'
  const sp = {
    search:   params.search,
    category: params.category,
    store:    params.store,
    filter:   params.filter,
    sort:     params.sort,
    dir:      params.dir,
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl">

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-sm text-stone-500 mt-1">
            {products.length} product{products.length !== 1 ? 's' : ''}
            {lowCount > 0 && <span className="ml-2 text-red-600 font-medium">· {lowCount} low stock</span>}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/inventory/counts" className="btn-secondary text-sm">Stocktake</Link>
            <Link href="/dashboard/inventory/import" className="btn-secondary text-sm">Import CSV</Link>
            <Link href="/dashboard/inventory/new" className="btn-primary text-sm">+ Add Product</Link>
          </div>
        )}
      </div>

      {dbError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Could not load inventory</p>
          <p className="text-xs mt-0.5 text-amber-600">{dbError}</p>
        </div>
      )}

      {/* ── Quick action strip ────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/inventory/receive" className="btn-primary text-sm">📦 Receive Goods</Link>
        <Link href="/dashboard/inventory/adjust" className="btn-secondary text-sm">✏️ Adjust Stock</Link>
      </div>

      {/* ── Filter bar ────────────────────────────────────────────── */}
      <form method="GET" className="card p-4 flex flex-wrap gap-3 items-center">
        {/* Preserve sort params across filter changes */}
        {params.sort && <input type="hidden" name="sort" value={params.sort} />}
        {params.dir  && <input type="hidden" name="dir"  value={params.dir} />}
        <input type="search" name="search" defaultValue={params.search ?? ''} placeholder="Search products or SKU…" className="flex-1 min-w-48 input text-sm" />
        <select name="category" defaultValue={params.category ?? ''} className="input text-sm">
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select name="store" defaultValue={params.store ?? ''} className="input text-sm">
          <option value="">All stores</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="filter" defaultValue={params.filter ?? ''} className="input text-sm">
          <option value="">All stock levels</option>
          <option value="low-stock">Low stock only</option>
        </select>
        <button type="submit" className="btn-primary text-sm">Search</button>
        {(params.search || params.category || params.store || params.filter) && (
          <Link href="/dashboard/inventory" className="btn-secondary text-sm">Clear</Link>
        )}
      </form>

      {/* ── Product table ─────────────────────────────────────────── */}
      {products.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-stone-500 text-sm">
            {params.search || params.category || params.filter
              ? 'No products match your filters.'
              : 'No products yet.'}
          </p>
          {canEdit && !params.search && !params.category && !params.filter && (
            <Link href="/dashboard/inventory/new" className="btn-primary text-sm mt-4 inline-block">Add First Product</Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50">
                  <SortableHeader label="SKU"      sortKey="sku"          currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <SortableHeader label="Product"  sortKey="name"         currentSort={sort} currentDir={dir} pathname={pathname} params={sp} />
                  <SortableHeader label="Category" sortKey="categoryName" currentSort={sort} currentDir={dir} pathname={pathname} params={sp} className="hidden md:table-cell" />
                  <SortableHeader label="Store"    sortKey="storeName"    currentSort={sort} currentDir={dir} pathname={pathname} params={sp} className="hidden lg:table-cell" />
                  <SortableHeader label="Stock"    sortKey="currentStock" currentSort={sort} currentDir={dir} pathname={pathname} params={sp} align="right" />
                  <SortableHeader label="Reorder"  sortKey="reorderPoint" currentSort={sort} currentDir={dir} pathname={pathname} params={sp} align="right" className="hidden sm:table-cell" />
                  {canEdit && (
                    <SortableHeader label="Cost" sortKey="costPrice" currentSort={sort} currentDir={dir} pathname={pathname} params={sp} align="right" className="hidden lg:table-cell" />
                  )}
                  <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {products.map(p => (
                  <tr key={p.id} className={`hover:bg-stone-50 transition-colors ${!p.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-stone-500">{p.sku}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{p.name}</p>
                      {p.nameEs && <p className="text-xs text-stone-400 italic">{p.nameEs}</p>}
                    </td>
                    <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{p.categoryName}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {p.storeName
                        ? <span className="text-xs font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded">{p.storeName}</span>
                        : <span className="text-xs text-stone-400">All stores</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold tabular-nums ${p.isLowStock ? 'text-red-600' : 'text-stone-900'}`}>
                        {p.currentStock.toFixed(p.unit === 'lb' || p.unit === 'kg' ? 1 : 0)}
                      </span>
                      <span className="text-xs text-stone-400 ml-1">{UNIT_LABEL[p.unit] ?? p.unit}</span>
                      {p.isLowStock && <span className="ml-1 text-xs text-red-500" title="Below reorder point">⚠</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-500 hidden sm:table-cell">{p.reorderPoint}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right text-stone-500 hidden lg:table-cell">
                        {p.costPrice ? `$${Number(p.costPrice).toFixed(2)}` : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/dashboard/inventory/receive?product=${p.id}`} className="text-xs text-terracotta hover:underline">Receive</Link>
                        {canEdit && <Link href={`/dashboard/inventory/${p.id}/edit`} className="text-xs text-stone-500 hover:text-stone-900 hover:underline">Edit</Link>}
                        {isOwner && p.isActive && <ArchiveButton id={p.id} name={p.name} />}
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
