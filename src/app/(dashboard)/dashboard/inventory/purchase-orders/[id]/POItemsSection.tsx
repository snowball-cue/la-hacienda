'use client'

import { useState } from 'react'
import type { POItemRow, POStatus } from '@/actions/purchase-orders'
import AddItemForm from './AddItemForm'
import EditItemButton from './EditItemButton'
import RemoveItemButton from './RemoveItemButton'

interface Props {
  orderId:      string
  status:       POStatus
  initialItems: POItemRow[]
  products:     Array<{ id: string; name: string; sku: string; unit: string; costPrice: string | null }>
}

function lineTotal(qty: string, cost: string | null) {
  return cost ? (Number(qty) * Number(cost)).toFixed(2) : null
}

export default function POItemsSection({ orderId, status, initialItems, products }: Props) {
  const [items, setItems] = useState<POItemRow[]>(initialItems)

  const orderTotal = items.reduce((sum, item) => {
    const lt = lineTotal(item.qtyOrdered, item.unitCost)
    return lt ? sum + Number(lt) : sum
  }, 0)

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3 border-b border-stone-100 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-stone-900">Order Items</h2>
        {status === 'draft' && (
          <AddItemForm
            orderId={orderId}
            products={products}
            onItemAdded={item => setItems(prev => [...prev, item])}
          />
        )}
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-stone-400 text-sm">
          No items added yet. Use <strong>Add Item</strong> to add products to this order.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Product</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Ordered</th>
              {(status === 'shipped' || status === 'received') && (
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Shipped</th>
              )}
              {status === 'received' && (
                <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Received</th>
              )}
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Unit Cost</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide">Line Total</th>
              {status === 'draft' && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {items.map(item => {
              const lt = lineTotal(item.qtyOrdered, item.unitCost)
              return (
                <tr key={item.id} className="hover:bg-stone-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-stone-900">{item.productName}</p>
                    <p className="text-xs text-stone-400">{item.sku} · {item.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-700">{item.qtyOrdered} {item.unit}</td>
                  {(status === 'shipped' || status === 'received') && (
                    <td className="px-4 py-3 text-right text-stone-500">
                      {item.qtyShipped ?? <span className="text-stone-300">—</span>}
                    </td>
                  )}
                  {status === 'received' && (
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
                  {status === 'draft' && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <EditItemButton
                          item={item}
                          onItemUpdated={updated =>
                            setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
                          }
                        />
                        <RemoveItemButton
                          itemId={item.id}
                          productName={item.productName}
                          onItemRemoved={() =>
                            setItems(prev => prev.filter(i => i.id !== item.id))
                          }
                        />
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
          {orderTotal > 0 && (
            <tfoot>
              <tr className="border-t border-stone-200">
                <td
                  colSpan={
                    status === 'draft'     ? 3 :
                    status === 'received'  ? 5 :
                    status === 'shipped'   ? 4 : 3
                  }
                  className="px-4 py-3 text-sm font-semibold text-stone-700 text-right"
                >
                  Order Total
                </td>
                <td className="px-4 py-3 text-right font-bold text-stone-900">
                  ${orderTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                {status === 'draft' && <td />}
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  )
}
