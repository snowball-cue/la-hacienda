'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adjustStock } from '@/actions/stock'
import type { ProductRow } from '@/actions/inventory'
import type { StockResult } from '@/actions/stock'

const REASONS = [
  { value: 'count_correction', label: 'Count Correction · Corrección de Conteo' },
  { value: 'spoilage',         label: 'Spoilage · Merma / Caducidad' },
  { value: 'theft',            label: 'Theft / Shrinkage · Robo / Faltante' },
  { value: 'return',           label: 'Customer Return · Devolución' },
  { value: 'adjustment',       label: 'General Adjustment · Ajuste General' },
]

interface Props {
  products:          ProductRow[]
  defaultProductId?: string
  stores:            Array<{ id: string; name: string }>
  defaultStoreId:    string | null
  isManager:         boolean
}

export default function AdjustForm({ products, defaultProductId, stores, defaultStoreId, isManager }: Props) {
  const router = useRouter()
  const [state, dispatch, isPending] = useActionState<StockResult | null, FormData>(
    adjustStock,
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
              [{p.sku}] {p.name} — stock: {p.currentStock} {p.unit}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Direction <span className="text-red-500">*</span></label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="direction" value="add" defaultChecked className="accent-terracotta" />
            <span className="text-sm text-stone-700">Add stock (+)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="direction" value="remove" className="accent-terracotta" />
            <span className="text-sm text-stone-700">Remove stock (−)</span>
          </label>
        </div>
      </div>

      <div>
        <label className="label">Quantity <span className="text-red-500">*</span></label>
        <input
          name="qty"
          type="number"
          step="0.001"
          min="0.001"
          required
          placeholder="0"
          className="input w-full"
        />
        <p className="text-xs text-stone-400 mt-1">Always enter a positive number — direction is set above.</p>
      </div>

      <div>
        <label className="label">Reason <span className="text-red-500">*</span></label>
        <select name="reason" required defaultValue="" className="input w-full">
          <option value="" disabled>Select a reason…</option>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Note (optional)</label>
        <input
          name="note"
          type="text"
          maxLength={500}
          placeholder="Additional context…"
          className="input w-full"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Saving…' : 'Record Adjustment'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Cancel
        </button>
      </div>

    </form>
  )
}
