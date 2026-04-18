import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getInventoryStats } from '@/actions/inventory'

export const metadata: Metadata = { title: 'Reports' }

export default async function ReportsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')

  const { totalSkus, lowStockCount, soonToExpire } = await getInventoryStats()

  const REPORTS = [
    {
      href:    '/dashboard/reports/low-stock',
      title:   'Low-Stock Report',
      titleEs: 'Reporte de Stock Bajo',
      desc:    'Products at or below their reorder point, sorted by urgency.',
      icon:    '⚠️',
      accent:  lowStockCount > 0,
    },
    {
      href:    '/dashboard/reports/snapshot',
      title:   'Inventory Snapshot',
      titleEs: 'Resumen de Inventario',
      desc:    'All active products with current stock, cost value, and sell value.',
      icon:    '📦',
      accent:  false,
    },
    {
      href:    '/dashboard/reports/movements',
      title:   'Stock Movements',
      titleEs: 'Movimientos de Inventario',
      desc:    'Full ledger history — filter by product, date range, or reason.',
      icon:    '📋',
      accent:  false,
    },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="text-sm text-stone-500 mt-1">
          Inventory analytics and audit trail · Análisis de inventario
        </p>
      </div>

      {/* ── Quick stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active SKUs',   value: totalSkus },
          { label: 'Low Stock',     value: lowStockCount, accent: lowStockCount > 0 },
          { label: 'Expiring Soon', value: soonToExpire,  accent: soonToExpire > 0 },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className={`card p-4 text-center ${accent ? 'border-terracotta/30 bg-terracotta/5' : ''}`}
          >
            <p className={`text-2xl font-bold ${accent ? 'text-terracotta' : 'text-stone-900'}`}>
              {value}
            </p>
            <p className="text-xs text-stone-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Report cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map(({ href, title, titleEs, desc, icon, accent }) => (
          <Link
            key={href}
            href={href}
            className={`card p-5 flex flex-col gap-3 hover:shadow-md transition-all group ${
              accent
                ? 'border-terracotta/30 bg-terracotta/5 hover:border-terracotta/60'
                : 'hover:border-stone-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl shrink-0" aria-hidden="true">{icon}</span>
              <div>
                <p className={`font-semibold text-sm group-hover:text-terracotta transition-colors ${
                  accent ? 'text-terracotta' : 'text-stone-900'
                }`}>
                  {title}
                </p>
                <p className="text-[10px] text-stone-400 italic">{titleEs}</p>
              </div>
            </div>
            <p className="text-xs text-stone-500 leading-relaxed flex-1">{desc}</p>
            <span className="text-xs text-terracotta">View report →</span>
          </Link>
        ))}
      </div>

    </div>
  )
}
