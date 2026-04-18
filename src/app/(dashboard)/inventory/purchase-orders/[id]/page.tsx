import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPurchaseOrderDetail, markOrderSent, cancelOrder } from '@/actions/purchase-orders'
import type { POStatus } from '@/actions/purchase-orders'
import POStatusBadge from '@/components/inventory/POStatusBadge'
import AddItemForm from './AddItemForm'
import RemoveItemButton from './RemoveItemButton'
import MarkShippedForm from './MarkShippedForm'
import ReceiveOrderForm from './ReceiveOrderForm'

export const metadata: Metadata = { title: 'Purchase Order' }

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')

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

  const lineTotal = (qty: string, cost: string | null) =>
    cost ? (Number(qty) * Number(cost)).toFixed(2) : null

  const orderTotal = po.items.reduce((sum, item) => {
    const lt = lineTotal(item.qtyOrdered, item.unitCost)
    return lt ? sum + Number(lt) : sum
  }, 0)

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
          {po.status === 'draft' && (
            <form action={async () => { 'use server'; await markOrderSent(id) }}>
              <button type="submit" className="btn-primary text-sm">
                Mark as Sent
              </button>
            </form>
          )}
          {po.status === 'sent' && <MarkShippedForm orderId={id} />}
          {(po.status === 'shipped' || po.status === 'sent') && (
            <ReceiveOrderForm orderId={id} items={po.items} />
          )}
          {po.status !== 'received' && po.status !== 'cancelled' && (
            <form action={async () => { 'use server'; await cancelOrder(id) }}>
              <button
                type="submit"
                className="btn-secondary text-sm text-red-600 border-red-200 hover:border-red-400"
              >
                Cancel Order
              </button>
            </form>
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

      {/* ── Items table ─────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-900">Order Items</h2>
          {po.status === 'draft' && (
            <AddItemForm
              orderId={id}
              products={products.map(p => ({
                id:        p.id,
                name:      p.name,
                sku:       p.sku,
                unit:      p.unit,
                costPrice: p.costPrice?.toString() ?? null,
              }))}
            />
          )}
        </div>

        {po.items.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-400 text-sm">
            No items added yet. Use <strong>Add Item</strong> to add products to this order.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Product</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Ordered</th>
                {(po.status === 'shipped' || po.status === 'received') && (
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Shipped</th>
                )}
                {po.status === 'received' && (
                  <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Received</th>
                )}
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Unit Cost</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Line Total</th>
                {po.status === 'draft' && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {po.items.map(item => {
                const lt = lineTotal(item.qtyOrdered, item.unitCost)
                return (
                  <tr key={item.id} className="hover:bg-stone-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{item.productName}</p>
                      <p className="text-xs text-stone-400">{item.sku} · {item.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-right text-stone-700">{item.qtyOrdered} {item.unit}</td>
                    {(po.status === 'shipped' || po.status === 'received') && (
                      <td className="px-4 py-3 text-right text-stone-500">
                        {item.qtyShipped ?? <span className="text-stone-300">—</span>}
                      </td>
                    )}
                    {po.status === 'received' && (
                      <td className="px-4 py-3 text-right font-medium text-emerald-700">
                        {item.qtyReceived ?? '—'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-stone-500">
                      {item.unitCost ? `$${item.unitCost}` : <span className="text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-900">
                      {lt ? `$${lt}` : <span className="text-stone-300">—</span>}
                    </td>
                    {po.status === 'draft' && (
                      <td className="px-4 py-3">
                        <RemoveItemButton itemId={item.id} productName={item.productName} />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            {orderTotal > 0 && (
              <tfoot>
                <tr className="border-t border-stone-200">
                  <td colSpan={po.status === 'draft' ? 3 : (po.status === 'received' ? 5 : po.status === 'shipped' ? 4 : 3)} className="px-4 py-3 text-sm font-semibold text-stone-700 text-right">
                    Order Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-stone-900">
                    ${orderTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {po.status === 'draft' && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>
    </div>
  )
}
