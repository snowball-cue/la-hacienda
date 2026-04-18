import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getProducts, getCategories } from '@/actions/inventory'
import { prisma } from '@/lib/prisma'
import ArchiveButton from './ArchiveButton'
import ProductTable from './ProductTable'
import Paginator from '@/components/ui/Paginator'

export const metadata: Metadata = { title: 'Inventory' }

type ShowFilter = 'active' | 'archived' | 'all'
function isShowFilter(s: string | undefined): s is ShowFilter {
  return s === 'active' || s === 'archived' || s === 'all'
}

const VALID_PAGE_SIZES = [25, 50, 100, 150, 200]

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; category?: string; filter?: string; show?: string; page?: string; perPage?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const params    = await searchParams
  const canEdit   = hasMinimumRole(user.role, 'manager')
  const isOwner   = hasMinimumRole(user.role, 'owner')
  const show      = isShowFilter(params.show) ? params.show : 'active'
  const perPage   = VALID_PAGE_SIZES.includes(Number(params.perPage)) ? Number(params.perPage) : 25
  const page      = Math.max(1, Number(params.page) || 1)

  const [result, categories, activeCount, archivedCount] = await Promise.all([
    getProducts({
      search:       params.search,
      categoryId:   params.category,
      lowStockOnly: params.filter === 'low-stock',
      show,
    }),
    getCategories(),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: false } }),
  ])

  const products     = result.success ? result.data : []
  const dbError      = !result.success ? result.error : null
  const lowCount     = products.filter((p) => p.isLowStock && p.isActive).length
  const totalProducts = products.length
  const safePage     = Math.min(page, Math.max(1, Math.ceil(totalProducts / perPage)) || 1)
  const paginated    = products.slice((safePage - 1) * perPage, safePage * perPage)

  function buildHref(p: number, pp: number) {
    const sp = new URLSearchParams()
    if (show !== 'active')  sp.set('show',     show)
    if (params.search)      sp.set('search',   params.search)
    if (params.category)    sp.set('category', params.category)
    if (params.filter)      sp.set('filter',   params.filter)
    if (p > 1)              sp.set('page',     String(p))
    if (pp !== 25)          sp.set('perPage',  String(pp))
    const q = sp.toString()
    return `/dashboard/inventory${q ? '?' + q : ''}`
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-7xl">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="text-sm text-stone-500 mt-1">
            {activeCount} active · {archivedCount} archived
            {lowCount > 0 && (
              <span className="ml-2 text-red-600 font-medium">
                · {lowCount} low stock
              </span>
            )}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/inventory/import" className="btn-secondary text-sm">
              Import CSV
            </Link>
            <Link href="/dashboard/inventory/new" className="btn-primary text-sm">
              + Add Product
            </Link>
          </div>
        )}
      </div>

      {/* ── Status tabs ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1 w-fit">
        {([
          { key: 'active',   label: 'Active',   count: activeCount },
          { key: 'archived', label: 'Archived', count: archivedCount },
          { key: 'all',      label: 'All',      count: activeCount + archivedCount },
        ] as const).map(tab => {
          const isSelected = show === tab.key
          const sp = new URLSearchParams({ show: tab.key })
          if (params.search)   sp.set('search',   params.search)
          if (params.category) sp.set('category', params.category)
          if (params.filter)   sp.set('filter',   params.filter)
          if (perPage !== 25)  sp.set('perPage',  String(perPage))
          return (
            <a
              key={tab.key}
              href={`/dashboard/inventory?${sp}`}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isSelected ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${isSelected ? 'text-stone-500' : 'text-stone-400'}`}>
                {tab.count}
              </span>
            </a>
          )
        })}
      </div>

      {/* ── DB error ──────────────────────────────────────────────────── */}
      {dbError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Could not load inventory</p>
          <p className="text-xs mt-0.5 text-amber-600">{dbError}</p>
        </div>
      )}

      {/* ── Quick action strip ────────────────────────────────────────── */}
      {show !== 'archived' && (
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/inventory/receive" className="btn-primary text-sm">
            📦 Receive Goods
          </Link>
          <Link href="/dashboard/inventory/adjust" className="btn-secondary text-sm">
            ✏️ Adjust Stock
          </Link>
        </div>
      )}

      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <form method="GET" className="card p-4 flex flex-wrap gap-3 items-center">
        {/* Preserve show tab + perPage across searches; reset to page 1 */}
        {show !== 'active' && <input type="hidden" name="show" value={show} />}
        {perPage !== 25    && <input type="hidden" name="perPage" value={perPage} />}
        <input
          type="search"
          name="search"
          defaultValue={params.search ?? ''}
          placeholder="Search products or SKU…"
          className="flex-1 min-w-48 input text-sm"
        />
        <select name="category" defaultValue={params.category ?? ''} className="input text-sm">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {show !== 'archived' && (
          <select name="filter" defaultValue={params.filter ?? ''} className="input text-sm">
            <option value="">All stock levels</option>
            <option value="low-stock">Low stock only</option>
          </select>
        )}
        <button type="submit" className="btn-primary text-sm">Search</button>
        {(params.search || params.category || params.filter) && (
          <Link href={`/dashboard/inventory?show=${show}`} className="btn-secondary text-sm">Clear</Link>
        )}
      </form>

      {/* ── Product table ─────────────────────────────────────────────── */}
      {products.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📦</div>
          <p className="text-stone-500 text-sm">
            {params.search || params.category || params.filter
              ? 'No products match your filters.'
              : show === 'archived'
                ? 'No archived products.'
                : 'No products yet.'}
          </p>
          {canEdit && !params.search && !params.category && !params.filter && show === 'active' && (
            <Link href="/dashboard/inventory/new" className="btn-primary text-sm mt-4 inline-block">
              Add First Product
            </Link>
          )}
        </div>
      ) : (
        <>
          <ProductTable
            products={paginated}
            canEdit={canEdit}
            isOwner={isOwner}
            show={show}
            archiveBtns={Object.fromEntries(
              paginated
                .filter(p => p.isActive)
                .map(p => [p.id, <ArchiveButton key={p.id} id={p.id} name={p.name} />])
            )}
          />
          <Paginator
            page={safePage}
            perPage={perPage}
            total={totalProducts}
            buildHref={buildHref}
            noun="products"
          />
        </>
      )}

    </div>
  )
}
