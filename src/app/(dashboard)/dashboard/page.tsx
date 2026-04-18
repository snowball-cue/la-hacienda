import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getTaskSummary } from '@/actions/tasks'
import { getInventoryStats } from '@/actions/inventory'
import { getRecentActivity } from '@/actions/stock'

export const metadata: Metadata = { title: 'Dashboard' }

/**
 * Returns a time-of-day greeting in the user's preferred style.
 * Keeps it warm and specific — "Good morning" feels generic,
 * "Buenos días" anchors the Mexican grocery identity.
 */
function timeGreeting(): { en: string; es: string } {
  const hour = new Date().getHours()
  if (hour < 12) return { en: 'Good morning',   es: 'Buenos días'   }
  if (hour < 18) return { en: 'Good afternoon', es: 'Buenas tardes' }
  return                { en: 'Good evening',   es: 'Buenas noches' }
}

// ── Compact metric tile ──────────────────────────────────────────────────────

function Metric({
  eyebrow, value, note, href, tone = 'neutral', icon,
}: {
  eyebrow: string
  value:   string | number
  note?:   string
  href?:   string
  tone?:   'neutral' | 'brand' | 'warning' | 'danger' | 'success'
  icon?:   React.ReactNode
}) {
  const toneMap = {
    neutral: { ring: 'ring-stone-200/60',  num: 'text-stone-900',     iconBg: 'bg-stone-100 text-stone-500' },
    brand:   { ring: 'ring-terracotta-200', num: 'text-terracotta',   iconBg: 'bg-terracotta-50 text-terracotta' },
    warning: { ring: 'ring-amber-200',     num: 'text-amber-600',     iconBg: 'bg-amber-50 text-amber-600' },
    danger:  { ring: 'ring-red-200',       num: 'text-red-600',       iconBg: 'bg-red-50 text-red-600' },
    success: { ring: 'ring-moss-200',      num: 'text-moss-600',      iconBg: 'bg-moss-50 text-moss-600' },
  }[tone]

  const content = (
    <div className={`card p-4 sm:p-5 md:p-6 ring-1 ring-inset ${toneMap.ring} ${href ? 'card-interactive' : ''}`}>
      <div className="flex items-start justify-between mb-2 sm:mb-3">
        <p className="eyebrow">{eyebrow}</p>
        {icon && (
          <span className={`hidden sm:flex h-9 w-9 items-center justify-center rounded-xl ${toneMap.iconBg}`}>
            {icon}
          </span>
        )}
      </div>
      <p className={`stat-number ${toneMap.num} text-3xl sm:text-4xl md:text-5xl`}>{value}</p>
      {note && <p className="text-xs text-stone-500 mt-1.5">{note}</p>}
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

// ── Quick action tile ────────────────────────────────────────────────────────

function ActionTile({
  label, labelEs, href, icon,
}: {
  label:   string
  labelEs: string
  href:    string
  icon:    React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group card-interactive p-4 flex items-center gap-3.5"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-terracotta-50 text-terracotta shrink-0 transition-colors group-hover:bg-terracotta group-hover:text-white">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-stone-900 truncate">{label}</p>
        <p className="text-xs text-stone-500 italic truncate">{labelEs}</p>
      </div>
      <svg className="h-4 w-4 text-stone-300 group-hover:text-terracotta transition-colors shrink-0"
           fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardHomePage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const canViewReports = hasMinimumRole(user.role, 'manager')

  const [invStats, taskResult, activityResult] = await Promise.all([
    getInventoryStats(),
    canViewReports ? getTaskSummary()      : Promise.resolve(null),
    canViewReports ? getRecentActivity(8)  : Promise.resolve(null),
  ])

  const { totalSkus, lowStockCount, soonToExpire } = invStats
  const recentActivity = activityResult?.success ? activityResult.data : []
  const taskSummary = taskResult?.success
    ? { in_progress: taskResult.data.in_progress, review: taskResult.data.review, overdue: taskResult.data.overdue }
    : { in_progress: 0, review: 0, overdue: 0 }

  const greeting = timeGreeting()
  const displayName = user.firstName ?? (user.fullName?.split(' ')[0] ?? 'there')
  const needsAttention = lowStockCount + soonToExpire

  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 lg:space-y-10 max-w-7xl mx-auto w-full animate-fade-in">

      {/* ── Hero greeting ─────────────────────────────────────────────── */}
      <section className="card-hero p-6 md:p-10 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <p className="eyebrow mb-2">{greeting.es}</p>
          <h1 className="page-title">
            {greeting.en}, <span className="text-terracotta">{displayName}</span>
          </h1>
          <p className="text-base text-stone-600 mt-2 leading-relaxed">
            {needsAttention > 0
              ? `${needsAttention} item${needsAttention === 1 ? '' : 's'} need attention today. Here's your rundown.`
              : "Everything's looking good. Here's your daily rundown."}
          </p>
        </div>
        {/* Decorative papel-picado style dot pattern */}
        <div
          aria-hidden="true"
          className="absolute -right-8 -bottom-12 h-72 w-72 rounded-full bg-terracotta/10 blur-3xl pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute -right-24 top-6 h-40 w-40 rounded-full bg-saffron/20 blur-3xl pointer-events-none"
        />
      </section>

      {/* ── Setup notice (shown when DB empty) ───────────────────────── */}
      {totalSkus === 0 && (
        <div className="rounded-2xl border border-saffron-200 bg-saffron-50 p-5 text-sm">
          <p className="font-semibold text-stone-800 mb-1">Database is empty</p>
          <p className="text-stone-600">
            Run the seed script to populate sample products, or add your first product from{' '}
            <Link href="/dashboard/inventory/new" className="link-brand">Inventory → Add Product</Link>.
          </p>
          <pre className="mt-3 bg-white/60 rounded-lg p-3 text-xs text-stone-700 font-mono border border-saffron-200">
            npx tsx --env-file=.env.local prisma/seed.ts
          </pre>
        </div>
      )}

      {/* ── Key metrics ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-end justify-between mb-5">
          <h2 className="section-title">Today at a glance</h2>
          <p className="text-xs text-stone-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric
            eyebrow="Total SKUs"
            value={totalSkus}
            note="Active products"
            href="/dashboard/inventory"
            tone="neutral"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
          <Metric
            eyebrow="Low Stock"
            value={lowStockCount}
            note={lowStockCount === 0 ? 'All items stocked' : 'Below reorder point'}
            href="/dashboard/inventory?filter=low-stock"
            tone={lowStockCount > 0 ? 'danger' : 'success'}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <Metric
            eyebrow="Near Expiry"
            value={soonToExpire}
            note={soonToExpire === 0 ? 'Nothing expiring soon' : 'Within 7 days'}
            href="/dashboard/inventory?filter=expiring"
            tone={soonToExpire > 0 ? 'warning' : 'success'}
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          {canViewReports && (
            <Metric
              eyebrow="Open Tasks"
              value={taskSummary.in_progress + taskSummary.review}
              note={taskSummary.overdue > 0 ? `${taskSummary.overdue} overdue` : 'In progress'}
              href="/dashboard/tasks"
              tone={taskSummary.overdue > 0 ? 'danger' : 'brand'}
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
            />
          )}
        </div>
      </section>

      {/* ── Quick actions ────────────────────────────────────────────── */}
      <section>
        <h2 className="section-title mb-5">Quick actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <ActionTile
            label="Receive Goods" labelEs="Recibir mercancía"
            href="/dashboard/inventory/receive"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8m-9 4v6m0 0l-3-3m3 3l3-3" />
              </svg>
            }
          />
          <ActionTile
            label="Adjust Stock" labelEs="Ajustar inventario"
            href="/dashboard/inventory/adjust"
            icon={
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />
          {hasMinimumRole(user.role, 'manager') && (
            <ActionTile
              label="Add Product" labelEs="Agregar producto"
              href="/dashboard/inventory/new"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          )}
          {canViewReports && (
            <ActionTile
              label="Reports" labelEs="Reportes"
              href="/dashboard/reports"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10" />
                </svg>
              }
            />
          )}
          {canViewReports && (
            <ActionTile
              label="Tasks" labelEs="Tareas"
              href="/dashboard/tasks"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
            />
          )}
          {hasMinimumRole(user.role, 'manager') && (
            <ActionTile
              label="Import Products" labelEs="Importar productos"
              href="/dashboard/inventory/import"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              }
            />
          )}
        </div>
      </section>

      {/* ── Recent activity ──────────────────────────────────────────── */}
      {canViewReports && (
        <section>
          <div className="flex items-end justify-between mb-5">
            <h2 className="section-title">Recent activity</h2>
            <Link href="/dashboard/reports" className="text-sm font-semibold text-terracotta hover:text-terracotta-dark">
              View full report →
            </Link>
          </div>

          {recentActivity.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-4">
                <svg className="h-6 w-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-stone-700">No activity yet</p>
              <p className="text-xs text-stone-500 mt-1">Receive goods or adjust stock to see entries here.</p>
            </div>
          ) : (
            <div className="card divide-y divide-stone-100 overflow-hidden">
              {recentActivity.map((entry) => {
                const qty     = Number(entry.changeQty)
                const isIn    = qty > 0
                const date    = new Date(entry.createdAt)
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                const reasonLabel: Record<string, string> = {
                  received:         'Received',
                  sold:             'Sold',
                  adjustment:       'Adjustment',
                  spoilage:         'Spoilage',
                  theft:            'Theft / Shrinkage',
                  return:           'Customer Return',
                  count_correction: 'Count Correction',
                  transfer_in:      'Transfer In',
                  transfer_out:     'Transfer Out',
                }
                return (
                  <div key={entry.id} className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50/60 transition-colors">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold tabular-nums shrink-0 ${
                        isIn ? 'bg-moss-50 text-moss-600' : 'bg-red-50 text-red-600'
                      }`}
                      aria-label={isIn ? 'Stock in' : 'Stock out'}
                    >
                      {isIn ? '+' : '−'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-900 truncate">{entry.productName}</p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {reasonLabel[entry.reason] ?? entry.reason}
                        {entry.note ? <span className="text-stone-400"> · {entry.note}</span> : null}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold tabular-nums ${isIn ? 'text-moss-600' : 'text-red-600'}`}>
                        {isIn ? '+' : ''}{qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">{dateStr} · {timeStr}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

    </div>
  )
}
