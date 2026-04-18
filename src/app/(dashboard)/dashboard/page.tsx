import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getTaskSummary } from '@/actions/tasks'
import { getInventoryStats } from '@/actions/inventory'
import { getRecentActivity } from '@/actions/stock'
import { getLastTestRun } from '@/actions/test-log'

export const metadata: Metadata = { title: 'Dashboard' }

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subtext,
  href,
  accent = false,
}: {
  label: string
  value: string | number
  subtext?: string
  href?: string
  accent?: boolean
}) {
  const content = (
    <div
      className={`card p-5 ${href ? 'hover:border-terracotta/50 hover:shadow-md transition-all cursor-pointer' : ''} ${
        accent ? 'border-terracotta/30 bg-terracotta/5' : ''
      }`}
    >
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ? 'text-terracotta' : 'text-stone-900'}`}>{value}</p>
      {subtext && <p className="text-xs text-stone-400 mt-1">{subtext}</p>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardHomePage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const canViewReports = hasMinimumRole(user.role, 'manager')

  const [invStats, taskResult, activityResult, lastRunResult] = await Promise.all([
    getInventoryStats(),
    canViewReports ? getTaskSummary()       : Promise.resolve(null),
    canViewReports ? getRecentActivity(10)  : Promise.resolve(null),
    canViewReports ? getLastTestRun()       : Promise.resolve(null),
  ])

  const { totalSkus, lowStockCount, soonToExpire } = invStats
  const recentActivity = activityResult?.success ? activityResult.data : []
  const lastRun        = lastRunResult?.success   ? lastRunResult.data  : null
  const taskSummary = taskResult?.success
    ? { in_progress: taskResult.data.in_progress, review: taskResult.data.review, overdue: taskResult.data.overdue }
    : { in_progress: 0, review: 0, overdue: 0 }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl">

      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">
          Welcome back{user.firstName ? `, ${user.firstName}` : ''}
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Here's what's happening at La Hacienda today.
        </p>
      </div>

      {/* ── Setup notice (shown when DB not yet connected) ────────────── */}
      {totalSkus === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-800 mb-1">Database setup required</p>
          <p className="text-amber-700">
            Configure <code className="bg-amber-100 px-1 rounded font-mono text-xs">.env.local</code>{' '}
            with your Supabase credentials, then run:
          </p>
          <pre className="mt-2 bg-amber-100 rounded p-2 text-xs text-amber-800 font-mono">
{`npx prisma migrate dev --name init
npx prisma db seed`}
          </pre>
          <p className="mt-2 text-amber-600 text-xs">
            Apply the RLS policies in{' '}
            <code className="bg-amber-100 px-1 rounded font-mono">supabase/rls-policies.sql</code>{' '}
            via the Supabase SQL editor.
          </p>
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total SKUs"
          value={totalSkus}
          subtext="Active products"
          href="/dashboard/inventory"
        />
        <StatCard
          label="Low Stock"
          value={lowStockCount}
          subtext={lowStockCount === 0 ? 'All items stocked' : 'Items below reorder point'}
          href="/dashboard/inventory?filter=low-stock"
          accent={lowStockCount > 0}
        />
        <StatCard
          label="Expiring Soon"
          value={soonToExpire}
          subtext="Within 7 days"
          href="/dashboard/inventory?filter=expiring"
          accent={soonToExpire > 0}
        />
        {canViewReports && (
          <StatCard
            label="Open Tasks"
            value={taskSummary.in_progress + taskSummary.review}
            subtext={taskSummary.overdue > 0 ? `${taskSummary.overdue} overdue` : 'In progress or review'}
            href="/dashboard/tasks"
            accent={taskSummary.overdue > 0}
          />
        )}
        {canViewReports && (
          <StatCard
            label="Last Test Run"
            value={lastRun ? `${lastRun.passed}/${lastRun.total}` : '—'}
            subtext={
              lastRun
                ? lastRun.hasFailed
                  ? 'Failures detected'
                  : 'All passed'
                : 'No runs yet'
            }
            href="/dashboard/test-log"
            accent={lastRun?.hasFailed ?? false}
          />
        )}
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <div>
        <h2 className="section-title mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              label:   'Receive Goods',
              labelEs: 'Recibir mercancía',
              icon:    '📦',
              href:    '/dashboard/inventory/receive',
              access:  true,
            },
            {
              label:   'Adjust Stock',
              labelEs: 'Ajustar inventario',
              icon:    '✏️',
              href:    '/dashboard/inventory/adjust',
              access:  true,
            },
            {
              label:   'Add Product',
              labelEs: 'Agregar producto',
              icon:    '➕',
              href:    '/dashboard/inventory/new',
              access:  hasMinimumRole(user.role, 'manager'),
            },
            {
              label:   'Low Stock Report',
              labelEs: 'Reporte de stock bajo',
              icon:    '📊',
              href:    '/dashboard/reports',
              access:  canViewReports,
            },
            {
              label:   'View Tasks',
              labelEs: 'Ver tareas',
              icon:    '✅',
              href:    '/dashboard/tasks',
              access:  canViewReports,
            },
            {
              label:   'Import Products',
              labelEs: 'Importar productos',
              icon:    '📂',
              href:    '/dashboard/inventory/import',
              access:  hasMinimumRole(user.role, 'manager'),
            },
          ]
            .filter((a) => a.access)
            .map(({ label, labelEs, icon, href }) => (
              <Link
                key={href}
                href={href}
                className="card p-4 flex items-center gap-3 hover:border-terracotta/40 hover:shadow-sm transition-all group"
              >
                <span className="text-2xl shrink-0" aria-hidden="true">{icon}</span>
                <div>
                  <p className="text-sm font-medium text-stone-900 group-hover:text-terracotta transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-stone-400 italic">{labelEs}</p>
                </div>
                <svg
                  className="h-4 w-4 text-stone-300 group-hover:text-terracotta ml-auto transition-colors"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
        </div>
      </div>

      {/* ── Recent activity ────────────────────────────────────────────── */}
      {canViewReports && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent Activity</h2>
            <Link href="/dashboard/reports" className="text-xs text-terracotta hover:underline">
              View full report →
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="card p-8 text-center text-stone-400">
              <svg
                className="h-10 w-10 mx-auto mb-3 text-stone-200"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-sm font-medium text-stone-500">No activity yet</p>
              <p className="text-xs mt-1">Receive goods or adjust stock to see entries here.</p>
            </div>
          ) : (
            <div className="card divide-y divide-stone-100">
              {recentActivity.map((entry) => {
                const qty     = Number(entry.changeQty)
                const isIn    = qty > 0
                const date    = new Date(entry.createdAt)
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                const reasonLabel: Record<string, string> = {
                  received:         'Received',
                  sold:             'Sold',
                  adjustment:       'Adjustment',
                  spoilage:         'Spoilage',
                  theft:            'Theft / Shrinkage',
                  return:           'Customer Return',
                  count_correction: 'Count Correction',
                }
                return (
                  <div key={entry.id} className="flex items-center gap-4 px-4 py-3">
                    <span
                      className={`text-sm font-semibold tabular-nums w-14 text-right shrink-0 ${
                        isIn ? 'text-green-600' : 'text-red-500'
                      }`}
                    >
                      {isIn ? '+' : ''}{qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{entry.productName}</p>
                      <p className="text-xs text-stone-400">
                        {reasonLabel[entry.reason] ?? entry.reason}
                        {entry.note ? ` · ${entry.note}` : ''}
                      </p>
                    </div>
                    <p className="text-xs text-stone-400 shrink-0 text-right">
                      <span className="block">{dateStr}</span>
                      <span className="block">{timeStr}</span>
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
