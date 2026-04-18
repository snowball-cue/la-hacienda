import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole, hasModuleAccess } from '@/lib/auth'
import { getAnalyticsData } from '@/actions/analytics'
import { getSelectedStoreIds } from '@/lib/store-filter'
import DailyFlowChart from './DailyFlowChart'
import DateRangeSelector from './DateRangeSelector'

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10)
}

function parseDate(s: string | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; days?: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')
  if (!hasModuleAccess(user, 'analytics')) redirect('/dashboard')

  const params = await searchParams

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Resolve date range: prefer from/to, fall back to ?days=, default 14 days
  let fromDate: Date
  let toDate: Date

  const parsedFrom = parseDate(params.from)
  const parsedTo   = parseDate(params.to)

  if (parsedFrom && parsedTo && parsedFrom <= parsedTo) {
    fromDate = parsedFrom
    toDate   = parsedTo
  } else {
    const days = Math.min(Math.max(Number(params.days) || 14, 1), 365)
    fromDate = new Date(today)
    fromDate.setDate(today.getDate() - days)
    toDate = new Date(today)
  }

  const fromStr = toYMD(fromDate)
  const toStr   = toYMD(toDate)

  const selectedStores = await getSelectedStoreIds()
  const result = await getAnalyticsData(fromDate, toDate, selectedStores.length ? selectedStores : undefined)

  if (!result.success) {
    return (
      <main className="p-6">
        <p className="text-red-600 dark:text-red-400">{result.error}</p>
      </main>
    )
  }

  const { summary, dailyFlow, categoryBreakdown, topProducts, poSummary } = result.data

  // Human-readable label for the header
  const rangeLabel = fromStr === toStr
    ? fromStr
    : `${fromStr} → ${toStr}`

  return (
    <main className="p-6 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Stock activity: <span className="font-medium text-stone-700">{rangeLabel}</span>
          </p>
        </div>
        <DateRangeSelector currentFrom={fromStr} currentTo={toStr} />
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Stock In</p>
          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            +{summary.totalIn.toLocaleString()}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">units received</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Stock Out</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            -{summary.totalOut.toLocaleString()}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">units removed</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Net Change</p>
          <p className={`text-2xl font-bold mt-1 ${summary.netChange >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {summary.netChange >= 0 ? '+' : ''}{summary.netChange.toLocaleString()}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">in / out</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Active Products</p>
          <p className="text-2xl font-bold text-stone-900 mt-1">{summary.activeProducts}</p>
          <p className="text-xs text-stone-400 mt-0.5">in catalog</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Low Stock</p>
          <p className={`text-2xl font-bold mt-1 ${summary.lowStockCount > 0 ? 'text-amber-700 dark:text-amber-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {summary.lowStockCount}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">at or below reorder point</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-stone-500 font-medium uppercase tracking-wide">Pending POs</p>
          <p className="text-2xl font-bold text-stone-900 mt-1">{summary.pendingPOs}</p>
          <p className="text-xs text-stone-400 mt-0.5">sent or in transit</p>
        </div>
      </div>

      {/* ── Daily Flow Chart ─────────────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="section-title mb-4">
          Daily Stock Flow — {rangeLabel}
        </h2>
        <DailyFlowChart data={dailyFlow} />
      </div>

      {/* ── Category Breakdown + PO Pipeline ────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        <div className="card p-5">
          <h2 className="section-title mb-4">Activity by Category</h2>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-stone-400">No movements in this period.</p>
          ) : (
            <div className="space-y-3">
              {categoryBreakdown.map((cat) => {
                const total    = cat.inQty + cat.outQty
                const maxTotal = categoryBreakdown[0].inQty + categoryBreakdown[0].outQty
                const pct      = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-stone-700">{cat.name}</span>
                      <span className="text-stone-500 text-xs">
                        +{cat.inQty.toFixed(0)} / -{cat.outQty.toFixed(0)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-terracotta rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="section-title mb-4">Purchase Order Pipeline</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Draft',     value: poSummary.draft,     color: 'text-stone-500' },
              { label: 'Sent',      value: poSummary.sent,      color: 'text-blue-700 dark:text-blue-400' },
              { label: 'Shipped',   value: poSummary.shipped,   color: 'text-amber-700 dark:text-amber-500' },
              { label: 'Received',  value: poSummary.received,  color: 'text-emerald-700 dark:text-emerald-400' },
              { label: 'Cancelled', value: poSummary.cancelled, color: 'text-red-600 dark:text-red-400' },
            ].map((item) => (
              <div key={item.label} className="bg-stone-100 rounded-lg p-3">
                <p className="text-xs text-stone-500 font-medium">{item.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${item.color}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top Products ─────────────────────────────────────────────────── */}
      <div className="card">
        <div className="px-5 py-4 border-b border-stone-200">
          <h2 className="section-title">Top Products by Movement</h2>
          <p className="text-xs text-stone-400 mt-0.5">Most active SKUs · {rangeLabel}</p>
        </div>
        {topProducts.length === 0 ? (
          <p className="p-5 text-sm text-stone-400">No stock movements in this period.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {topProducts.map((p, i) => (
              <div key={p.sku} className="px-5 py-3 flex items-center gap-4">
                <span className="text-sm font-bold text-stone-300 w-5 text-right shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-800 truncate">{p.name}</p>
                  <p className="text-xs text-stone-400">{p.sku}</p>
                </div>
                <div className="flex items-center gap-3 text-xs shrink-0">
                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">+{p.inQty.toFixed(0)} in</span>
                  <span className="text-red-600 dark:text-red-400 font-medium">-{p.outQty.toFixed(0)} out</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  )
}
