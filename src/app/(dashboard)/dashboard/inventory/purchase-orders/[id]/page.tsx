import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getAuthUser, hasMinimumRole, hasModuleAccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPurchaseOrderDetail, markOrderSent } from '@/actions/purchase-orders'
import type { POStatus } from '@/actions/purchase-orders'
import POStatusBadge from '@/components/inventory/POStatusBadge'
import CancelOrderButton from './CancelOrderButton'
import EditOrderButton from './EditOrderButton'
import MarkShippedForm from './MarkShippedForm'
import ReceiveOrderForm from './ReceiveOrderForm'
import POItemsSection from './POItemsSection'
import type { POActivityEntry } from '@/actions/purchase-orders'

export const metadata: Metadata = { title: 'Purchase Order' }

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')
  if (!hasModuleAccess(user, 'purchase_orders')) redirect('/dashboard')

  const { id } = await params
  const result = await getPurchaseOrderDetail(id)
  if (!result.success) notFound()
  const po = result.data

  const products = po.status === 'draft'
    ? await prisma.product.findMany({
        where:   { isActive: true },
        orderBy: { name: 'asc' },
        select:  { id: true, name: true, sku: true, unit: true, costPrice: true },
      })
    : []

  const fmtDate = (d: string | null) => d
    ? new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Link href="/dashboard/inventory/purchase-orders" className="text-xs text-stone-400 hover:text-terracotta mb-1 inline-block">
            ← Purchase Orders
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="page-title">{po.poNumber ?? 'Purchase Order'}</h1>
            <POStatusBadge status={po.status} />
          </div>
          <p className="text-sm text-stone-500 mt-1">
            {po.supplierName} ·{' '}
            {new Date(po.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Status transition buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Edit order — available for non-terminal statuses */}
          {po.status !== 'received' && po.status !== 'cancelled' && (
            <EditOrderButton
              orderId={id}
              notes={po.notes}
              invoiceNumber={po.invoiceNumber}
              invoiceDate={po.invoiceDate}
            />
          )}
          {po.status === 'draft' && (
            <form action={async () => { 'use server'; await markOrderSent(id) }}>
              <button type="submit" className="btn-primary text-sm">
                Place Order
              </button>
            </form>
          )}
          {po.status === 'sent' && <MarkShippedForm orderId={id} />}
          {(po.status === 'shipped' || po.status === 'sent') && (
            <ReceiveOrderForm orderId={id} items={po.items} />
          )}
          {po.status !== 'received' && po.status !== 'cancelled' && (
            <CancelOrderButton orderId={id} />
          )}
        </div>
      </div>

      {/* ── Shipping info (when shipped) ─────────────────────────────────── */}
      {po.status === 'shipped' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <p className="font-medium text-amber-800">In Transit</p>
          <div className="text-amber-700 mt-1 space-y-0.5 text-xs">
            {po.trackingRef && <p>Tracking: <strong>{po.trackingRef}</strong></p>}
            {po.expectedAt  && <p>Expected: <strong>{fmtDate(po.expectedAt)}</strong></p>}
            {!po.trackingRef && !po.expectedAt && <p>No tracking information recorded.</p>}
          </div>
        </div>
      )}

      {/* ── Notes ───────────────────────────────────────────────────────── */}
      {po.notes && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
          {po.notes}
        </div>
      )}

      {/* ── Items table (client component — instant add/edit/remove) ────── */}
      <POItemsSection
        orderId={id}
        status={po.status as POStatus}
        initialItems={po.items}
        products={products.map(p => ({
          id:        p.id,
          name:      p.name,
          sku:       p.sku,
          unit:      p.unit,
          costPrice: p.costPrice?.toString() ?? null,
        }))}
      />

      {/* ── Activity Log ────────────────────────────────────────────────── */}
      {po.activity.length > 0 && (
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-stone-900 mb-4">Activity Log</h2>
          <ol className="relative border-l border-stone-200 space-y-4 ml-2">
            {po.activity.map((entry, i) => (
              <ActivityEntry key={i} entry={entry} />
            ))}
          </ol>
        </div>
      )}

    </div>
  )
}

const ACTION_CONFIG: Record<POActivityEntry['action'], { label: string; dot: string }> = {
  created:   { label: 'Order created',      dot: 'bg-stone-400'   },
  edited:    { label: 'Order edited',       dot: 'bg-blue-300'    },
  sent:      { label: 'Order placed',       dot: 'bg-blue-500'    },
  shipped:   { label: 'Marked in transit',  dot: 'bg-amber-500'   },
  received:  { label: 'Order received',     dot: 'bg-emerald-500' },
  cancelled: { label: 'Order cancelled',    dot: 'bg-red-500'     },
}

function ActivityEntry({ entry }: { entry: POActivityEntry }) {
  const cfg = ACTION_CONFIG[entry.action]
  const date = new Date(entry.at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
  return (
    <li className="ml-4">
      <span className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm font-medium text-stone-900">{cfg.label}</span>
        <span className="text-xs text-stone-500">by <strong className="text-stone-700">{entry.byName}</strong></span>
        <span className="text-xs text-stone-400">{date}</span>
      </div>
      {entry.note && (
        <p className="text-xs text-stone-500 mt-0.5">
          {entry.action === 'shipped' ? `Tracking: ${entry.note}` : entry.note}
        </p>
      )}
    </li>
  )
}
