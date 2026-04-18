import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { getAuthUser, hasMinimumRole, hasModuleAccess } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSupplierOrders } from '@/actions/purchase-orders'
import type { POStatus } from '@/actions/purchase-orders'
import POStatusBadge from '@/components/inventory/POStatusBadge'

export const metadata: Metadata = { title: 'Vendor' }

const STATUS_GROUPS: Array<{ label: string; statuses: POStatus[]; emptyMsg: string }> = [
  {
    label:    'Active Orders',
    statuses: ['draft', 'sent'],
    emptyMsg: 'No active orders.',
  },
  {
    label:    'In Transit',
    statuses: ['shipped'],
    emptyMsg: 'No orders currently in transit.',
  },
  {
    label:    'Recently Received',
    statuses: ['received'],
    emptyMsg: 'No received orders.',
  },
  {
    label:    'Cancelled',
    statuses: ['cancelled'],
    emptyMsg: 'No cancelled orders.',
  },
]

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (!hasMinimumRole(user.role, 'manager')) redirect('/dashboard')
  if (!hasModuleAccess(user, 'suppliers')) redirect('/dashboard')

  const { id } = await params

  const [supplier, ordersResult] = await Promise.all([
    prisma.supplier.findUnique({ where: { id } }),
    getSupplierOrders(id),
  ])

  if (!supplier) notFound()
  const orders = ordersResult.success ? ordersResult.data : []

  const inTransit = orders.filter(o => o.status === 'shipped')

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/suppliers" className="text-xs text-stone-400 hover:text-terracotta mb-1 inline-block">
            ← Suppliers
          </Link>
          <h1 className="page-title">{supplier.name}</h1>
        </div>
        <Link
          href={`/dashboard/inventory/purchase-orders/new`}
          className="btn-primary text-sm shrink-0"
        >
          + New Order
        </Link>
      </div>

      {/* ── Contact card ────────────────────────────────────────────────── */}
      <div className="card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs text-stone-500 mb-0.5">Contact</p>
          <p className="font-medium text-stone-900">{supplier.contactName ?? <span className="text-stone-400 italic">Not set</span>}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 mb-0.5">Phone</p>
          <p className="font-medium text-stone-900">{supplier.phone ?? <span className="text-stone-400 italic">Not set</span>}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500 mb-0.5">Email</p>
          <p className="font-medium text-stone-900">{supplier.email ?? <span className="text-stone-400 italic">Not set</span>}</p>
        </div>
        {supplier.notes && (
          <div className="sm:col-span-3">
            <p className="text-xs text-stone-500 mb-0.5">Notes</p>
            <p className="text-stone-700">{supplier.notes}</p>
          </div>
        )}
      </div>

      {/* ── In-transit alert ────────────────────────────────────────────── */}
      {inTransit.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <p className="font-medium text-amber-800">
            {inTransit.length} order{inTransit.length !== 1 ? 's' : ''} in transit
          </p>
          <div className="mt-1 space-y-0.5">
            {inTransit.map(o => (
              <p key={o.id} className="text-xs text-amber-700">
                {o.poNumber ?? o.id.slice(0, 8)}
                {o.trackingRef && ` · ${o.trackingRef}`}
                {o.expectedAt  && ` · Expected ${o.expectedAt}`}
                {' – '}
                <Link href={`/dashboard/inventory/purchase-orders/${o.id}`} className="underline">
                  View
                </Link>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* ── Order groups ─────────────────────────────────────────────────── */}
      {STATUS_GROUPS.map(group => {
        const groupOrders = orders.filter(o => group.statuses.includes(o.status))
        return (
          <section key={group.label} className="space-y-2">
            <h2 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
              {group.label}
              <span className="text-xs font-normal text-stone-400">({groupOrders.length})</span>
            </h2>
            {groupOrders.length === 0 ? (
              <p className="text-xs text-stone-400 pl-1">{group.emptyMsg}</p>
            ) : (
              <div className="card divide-y divide-stone-100">
                {groupOrders.map(order => (
                  <div key={order.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-900 font-mono">
                          {order.poNumber ?? order.id.slice(0, 8)}
                        </span>
                        <POStatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {order.itemCount} item{order.itemCount !== 1 ? 's' : ''} ·{' '}
                        {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {order.status === 'shipped' && order.trackingRef && ` · ${order.trackingRef}`}
                        {order.status === 'shipped' && order.expectedAt && ` · Expected ${order.expectedAt}`}
                        {order.status === 'received' && order.receivedAt && ` · Received ${new Date(order.receivedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/inventory/purchase-orders/${order.id}`}
                      className="text-xs text-terracotta hover:underline shrink-0"
                    >
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}

      {orders.length === 0 && (
        <div className="card p-10 text-center text-stone-400 text-sm">
          No purchase orders with this supplier yet.{' '}
          <Link href="/dashboard/inventory/purchase-orders/new" className="text-terracotta hover:underline">
            Create one
          </Link>
        </div>
      )}
    </div>
  )
}
