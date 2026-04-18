'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { getProductDetail, unarchiveProduct, deleteProduct } from '@/actions/inventory'
import type { ProductRow, ProductDetail } from '@/actions/inventory'

const UNIT_LABEL: Record<string, string> = {
  each: 'ea', lb: 'lb', kg: 'kg', case: 'case', oz: 'oz', dozen: 'doz', bag: 'bag',
}

const REASON_LABEL: Record<string, string> = {
  received:         'Received',
  sold:             'Sale',
  adjustment:       'Adjustment',
  spoilage:         'Spoilage',
  theft:            'Shrinkage',
  return:           'Return',
  count_correction: 'Count fix',
}

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-stone-100 text-stone-600',
  sent:      'bg-blue-100 text-blue-700',
  shipped:   'bg-amber-100 text-amber-700',
  received:  'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

interface RowProps {
  product:    ProductRow
  canEdit:    boolean
  isOwner:    boolean
  archiveBtn: React.ReactNode
  show:       'active' | 'archived' | 'all'
}

function ProductRow({ product: p, canEdit, isOwner, archiveBtn, show }: RowProps) {
  const [expanded, setExpanded] = useState(false)
  const [detail,   setDetail]   = useState<ProductDetail | null>(null)
  const [error,    setError]     = useState<string | null>(null)
  const [pending,  start]        = useTransition()

  function toggle() {
    if (!expanded && !detail) {
      start(async () => {
        const result = await getProductDetail(p.id)
        if (result.success) setDetail(result.data)
        else setError(result.error)
      })
    }
    setExpanded(e => !e)
  }

  const margin = detail?.margin

  return (
    <>
      {/* ── Main row ─────────────────────────────────────────────────── */}
      <tr className={`hover:bg-stone-50 transition-colors ${!p.isActive ? 'opacity-50' : ''}`}>
        <td className="px-3 py-3 w-8">
          <button
            onClick={toggle}
            className="w-6 h-6 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title={expanded ? 'Collapse' : 'Expand details'}
          >
            <svg className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </td>
        <td className="px-4 py-3 font-mono text-xs text-stone-500">{p.sku}</td>
        <td className="px-4 py-3">
          <p className="font-medium text-stone-900">{p.name}</p>
          {p.nameEs && <p className="text-xs text-stone-400 italic">{p.nameEs}</p>}
        </td>
        <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{p.categoryName}</td>
        <td className="px-4 py-3 text-right">
          <span className={`font-semibold tabular-nums ${p.isLowStock ? 'text-red-600' : 'text-stone-900'}`}>
            {p.currentStock.toFixed(p.unit === 'lb' || p.unit === 'kg' ? 1 : 0)}
          </span>
          <span className="text-xs text-stone-400 ml-1">{UNIT_LABEL[p.unit] ?? p.unit}</span>
          {p.isLowStock && <span className="ml-1 text-xs text-red-500" title="Below reorder point">⚠</span>}
        </td>
        <td className="px-4 py-3 text-right text-stone-500 hidden sm:table-cell">
          {p.reorderPoint} <span className="text-xs">{UNIT_LABEL[p.unit] ?? p.unit}</span>
        </td>
        {canEdit && (
          <td className="px-4 py-3 text-right text-stone-500 hidden lg:table-cell">
            {p.costPrice ? `$${Number(p.costPrice).toFixed(2)}` : '—'}
          </td>
        )}
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            {p.isActive && (
              <Link href={`/dashboard/inventory/receive?product=${p.id}`} className="text-xs text-terracotta hover:underline">Receive</Link>
            )}
            {canEdit && p.isActive && (
              <Link href={`/dashboard/inventory/${p.id}/edit`} className="text-xs text-stone-500 hover:text-stone-900 hover:underline">Edit</Link>
            )}
            {isOwner && p.isActive && archiveBtn}
            {isOwner && !p.isActive && <RestoreButton id={p.id} name={p.name} />}
            {isOwner && <DeleteButton id={p.id} name={p.name} isArchived={!p.isActive} />}
          </div>
        </td>
      </tr>

      {/* ── Expanded detail panel ────────────────────────────────────── */}
      {expanded && (
        <tr>
          <td colSpan={canEdit ? 8 : 7} className="px-0 py-0">
            <div className="border-t border-b border-stone-100 bg-stone-50 px-6 py-4">
              {pending && (
                <p className="text-xs text-stone-400 animate-pulse">Loading details…</p>
              )}
              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}
              {detail && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                  {/* ── Supplier ── */}
                  <div>
                    <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Supplier</p>
                    {p.supplierName ? (
                      <div className="space-y-0.5 text-sm">
                        <p className="font-medium text-stone-800">{p.supplierName}</p>
                        {detail.supplierContactName && (
                          <p className="text-stone-500 text-xs">{detail.supplierContactName}</p>
                        )}
                        {detail.supplierPhone && (
                          <a href={`tel:${detail.supplierPhone}`} className="text-xs text-stone-500 hover:text-terracotta block">
                            {detail.supplierPhone}
                          </a>
                        )}
                        {detail.supplierEmail && (
                          <a href={`mailto:${detail.supplierEmail}`} className="text-xs text-stone-500 hover:text-terracotta block truncate">
                            {detail.supplierEmail}
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400">No supplier linked</p>
                    )}
                  </div>

                  {/* ── Last Purchase Order ── */}
                  <div>
                    <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Last Purchase Order</p>
                    {detail.lastPO ? (
                      <div className="space-y-0.5 text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-stone-800">{detail.lastPO.poNumber ?? 'PO'}</span>
                          <span className={`badge text-[9px] uppercase ${STATUS_BADGE[detail.lastPO.status] ?? 'bg-stone-100 text-stone-500'}`}>
                            {detail.lastPO.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">Ordered: {fmtDate(detail.lastPO.orderedAt)}</p>
                        {detail.lastPO.expectedAt && (
                          <p className="text-xs text-stone-500">Expected: {fmtDate(detail.lastPO.expectedAt)}</p>
                        )}
                        {detail.lastPO.qtyOrdered && (
                          <p className="text-xs text-stone-500">
                            Qty: {detail.lastPO.qtyOrdered} {UNIT_LABEL[p.unit] ?? p.unit}
                            {detail.lastPO.unitCost && ` @ $${detail.lastPO.unitCost}`}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-400">No purchase orders yet</p>
                    )}
                  </div>

                  {/* ── Reorder & Pricing ── */}
                  <div>
                    <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Reorder & Pricing</p>
                    <div className="space-y-0.5 text-sm">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-500">Reorder at</span>
                        <span className="text-stone-700 font-medium">{p.reorderPoint} {UNIT_LABEL[p.unit] ?? p.unit}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-500">Reorder qty</span>
                        <span className="text-stone-700 font-medium">{p.reorderQty > 0 ? `${p.reorderQty} ${UNIT_LABEL[p.unit] ?? p.unit}` : '—'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-500">Cost</span>
                        <span className="text-stone-700 font-medium">{p.costPrice ? `$${Number(p.costPrice).toFixed(2)}` : '—'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-500">Sell</span>
                        <span className="text-stone-700 font-medium">{p.sellPrice ? `$${Number(p.sellPrice).toFixed(2)}` : '—'}</span>
                      </div>
                      {margin != null && (
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Margin</span>
                          <span className={`font-semibold ${margin < 20 ? 'text-red-600' : margin < 40 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {margin}%
                          </span>
                        </div>
                      )}
                      {p.shelfLifeDays && (
                        <div className="flex justify-between text-xs">
                          <span className="text-stone-500">Shelf life</span>
                          <span className="text-stone-700">{p.shelfLifeDays}d</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Recent Movements ── */}
                  <div>
                    <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide mb-1.5">Recent Movements</p>
                    {detail.recentMovements.length === 0 ? (
                      <p className="text-xs text-stone-400">No stock movements yet</p>
                    ) : (
                      <div className="space-y-1">
                        {detail.recentMovements.map((m, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`font-medium shrink-0 ${m.qty > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {m.qty > 0 ? '+' : ''}{m.qty.toFixed(1)}
                              </span>
                              <span className="text-stone-500 truncate">{REASON_LABEL[m.reason] ?? m.reason}</span>
                            </div>
                            <span className="text-stone-400 shrink-0 ml-2">{fmtDate(m.date)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

interface TableProps {
  products:    ProductRow[]
  canEdit:     boolean
  isOwner:     boolean
  show:        'active' | 'archived' | 'all'
  archiveBtns: Record<string, React.ReactNode>
}

export default function ProductTable({ products, canEdit, isOwner, show, archiveBtns }: TableProps) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="px-3 py-3 w-8" />
              <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">SKU</th>
              <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Product</th>
              <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden md:table-cell">Category</th>
              <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Stock</th>
              <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden sm:table-cell">Reorder at</th>
              {canEdit && (
                <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide hidden lg:table-cell">Cost</th>
              )}
              <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {products.map(p => (
              <ProductRow
                key={p.id}
                product={p}
                canEdit={canEdit}
                isOwner={isOwner}
                show={show}
                archiveBtn={archiveBtns[p.id] ?? null}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RestoreButton({ id, name }: { id: string; name: string }) {
  const [pending, setPending] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handle() {
    if (!confirm(`Restore "${name}" to active inventory?`)) return
    setPending(true)
    setError(null)
    const result = await unarchiveProduct(id)
    setPending(false)
    if (!result.success) setError(result.error)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className="text-xs text-emerald-700 hover:text-emerald-900 hover:underline"
      >
        {pending ? 'Restoring…' : 'Restore'}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

function DeleteButton({ id, name, isArchived }: { id: string; name: string; isArchived: boolean }) {
  const [open,    setOpen]   = useState(false)
  const [pending, start]     = useTransition()
  const [error,   setError]  = useState<string | null>(null)

  function handle() {
    setError(null)
    start(async () => {
      const result = await deleteProduct(id)
      if (result.success) setOpen(false)
      else setError(result.error)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setError(null) }}
        className="text-xs text-red-600 hover:text-red-800 hover:underline"
      >
        Delete
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !pending && setOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-stone-900">Delete &ldquo;{name}&rdquo;?</h2>
                <p className="text-sm text-stone-500 mt-1">
                  This permanently removes the product and cannot be undone.
                  {!isArchived && ' Consider archiving it instead to preserve stock history.'}
                </p>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="btn-secondary text-sm"
              >
                Keep Product
              </button>
              <button
                type="button"
                onClick={handle}
                disabled={pending}
                className="btn-primary text-sm bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
              >
                {pending ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
