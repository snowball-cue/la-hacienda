'use client'

import { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { receiveGoods } from '@/actions/stock'
import type { ProductRow } from '@/actions/inventory'
import type { StockResult } from '@/actions/stock'

const UNIT_LABEL: Record<string, string> = {
  each: 'ea', lb: 'lb', kg: 'kg', case: 'case', oz: 'oz', dozen: 'doz', bag: 'bag',
}

function fmt(n: number, unit: string) {
  const isWeight = unit === 'lb' || unit === 'kg' || unit === 'oz'
  return `${n.toFixed(isWeight ? 1 : 0)} ${UNIT_LABEL[unit] ?? unit}`
}

interface Props {
  products:         ProductRow[]
  defaultProductId?: string
}

export default function ReceiveForm({ products, defaultProductId }: Props) {
  const router = useRouter()
  const [state, dispatch, isPending] = useActionState<StockResult | null, FormData>(
    receiveGoods,
    null,
  )

  const [selectedId, setSelectedId] = useState(defaultProductId ?? '')
  const [qty, setQty]               = useState('')

  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard/inventory')
      router.refresh()
    }
  }, [state, router])

  const err = !state?.success ? state?.error : null

  const selected = products.find(p => p.id === selectedId) ?? null
  const unit     = selected?.unit ?? 'each'
  const unitLbl  = UNIT_LABEL[unit] ?? unit
  const isWeight = unit === 'lb' || unit === 'kg' || unit === 'oz'
  const qtyNum   = parseFloat(qty)
  const newStock = selected && !isNaN(qtyNum) && qtyNum > 0
    ? selected.currentStock + qtyNum
    : null

  return (
    <form action={dispatch} className="card p-6 space-y-5">

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* Product selector */}
      <div>
        <label className="label">Product <span className="text-red-500">*</span></label>
        <select
          name="productId"
          value={selectedId}
          onChange={e => { setSelectedId(e.target.value); setQty('') }}
          required
          className="input w-full"
        >
          <option value="">Select a product…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.sku}] {p.name}
              {p.isLowStock ? ' ⚠ LOW' : ''}
              {' '}— {fmt(p.currentStock, p.unit)} on hand
            </option>
          ))}
        </select>
      </div>

      {/* Current stock info card */}
      {selected && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 px-4 py-3 text-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-stone-500">Current stock</p>
            <p className={`font-semibold text-base ${selected.isLowStock ? 'text-red-600' : 'text-stone-900'}`}>
              {fmt(selected.currentStock, unit)}
              {selected.isLowStock && <span className="ml-1.5 text-xs font-normal text-red-500">⚠ below reorder point ({selected.reorderPoint} {unitLbl})</span>}
            </p>
          </div>
          {newStock !== null && (
            <div className="text-right">
              <p className="text-xs text-stone-500">After receipt</p>
              <p className="font-semibold text-base text-emerald-700">{fmt(newStock, unit)}</p>
            </div>
          )}
        </div>
      )}

      {/* Quantity input */}
      <div>
        <label className="label">
          Amount Received ({unitLbl}) <span className="text-red-500">*</span>
        </label>
        <input
          name="qty"
          type="number"
          step={isWeight ? '0.1' : '1'}
          min={isWeight ? '0.1' : '1'}
          required
          value={qty}
          onChange={e => setQty(e.target.value)}
          placeholder={isWeight ? '0.0' : '0'}
          className="input w-full"
        />
        {selected && (
          <p className="text-xs text-stone-400 mt-1">
            Enter the number of <strong>{unitLbl}</strong> received.
            {selected.reorderQty > 0 && ` Suggested reorder qty: ${selected.reorderQty} ${unitLbl}.`}
          </p>
        )}
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
