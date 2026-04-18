'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { receiveGoods } from '@/actions/stock'
import type { ProductRow } from '@/actions/inventory'
import type { StockResult } from '@/actions/stock'

interface Props {
  products:         ProductRow[]
  defaultProductId?: string
  stores:           Array<{ id: string; name: string }>
  defaultStoreId:   string | null
  isManager:        boolean
}

export default function ReceiveForm({ products, defaultProductId, stores, defaultStoreId, isManager }: Props) {
  const router = useRouter()
  const [state, dispatch, isPending] = useActionState<StockResult | null, FormData>(
    receiveGoods,
    null,
  )

  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard/inventory')
      router.refresh()
    }
  }, [state, router])

  const err = !state?.success ? state?.error : null

  return (
    <form action={dispatch} className="card p-6 space-y-5">

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {state?.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Stock updated — redirecting…
        </div>
      )}

      {/* Store selector — managers can override their assigned store */}
      {isManager && stores.length > 0 ? (
        <div>
          <label className="label">Store <span className="text-red-500">*</span></label>
          <select name="storeId" defaultValue={defaultStoreId ?? ''} required className="input w-full">
            <option value="">Select store…</option>
            {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      ) : (
        <input type="hidden" name="storeId" value={defaultStoreId ?? ''} />
      )}

      <div>
        <label className="label">Product <span className="text-red-500">*</span></label>
        <select name="productId" defaultValue={defaultProductId ?? ''} required className="input w-full">
          <option value="">Select a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.sku}] {p.name}
              {p.isLowStock ? ' ⚠ LOW' : ''}
              {' '}— stock: {p.currentStock} {p.unit}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">
          Quantity Received <span className="text-red-500">*</span>
        </label>
        <input
          name="qty"
          type="number"
          step="0.001"
          min="0.001"
          required
          placeholder="0"
          className="input w-full"
        />
        <p className="text-xs text-stone-400 mt-1">
          Enter the number of units received. Use decimals for weight (e.g. 2.5 lb).
        </p>
      </div>

      <div>
        <label className="label">Note (optional)</label>
        <input
          name="note"
          type="text"
          maxLength={500}
          placeholder="Invoice #, supplier name, etc."
          className="input w-full"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Saving…' : 'Record Receipt'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>

    </form>
  )
}
