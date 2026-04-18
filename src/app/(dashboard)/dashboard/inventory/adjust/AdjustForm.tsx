'use client'

import { useState, useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { adjustStock } from '@/actions/stock'
import type { ProductRow } from '@/actions/inventory'
import type { StockResult } from '@/actions/stock'

const UNIT_LABEL: Record<string, string> = {
  each: 'ea', lb: 'lb', kg: 'kg', case: 'case', oz: 'oz', dozen: 'doz', bag: 'bag',
}

const REASONS = [
  { value: 'count_correction', label: 'Count Correction · Corrección de Conteo' },
  { value: 'spoilage',         label: 'Spoilage · Merma / Caducidad' },
  { value: 'theft',            label: 'Theft / Shrinkage · Robo / Faltante' },
  { value: 'return',           label: 'Customer Return · Devolución' },
  { value: 'adjustment',       label: 'General Adjustment · Ajuste General' },
]

function fmt(n: number, unit: string) {
  const isWeight = unit === 'lb' || unit === 'kg' || unit === 'oz'
  return `${n.toFixed(isWeight ? 1 : 0)} ${UNIT_LABEL[unit] ?? unit}`
}

interface Props {
  products:          ProductRow[]
  defaultProductId?: string
}

export default function AdjustForm({ products, defaultProductId }: Props) {
  const router = useRouter()
  const [state, dispatch, isPending] = useActionState<StockResult | null, FormData>(
    adjustStock,
    null,
  )

  const [selectedId, setSelectedId] = useState(defaultProductId ?? '')
  const [qty,        setQty]        = useState('')
  const [direction,  setDirection]  = useState<'add' | 'remove'>('add')

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
  const delta    = direction === 'add' ? qtyNum : -qtyNum
  const newStock = selected && !isNaN(qtyNum) && qtyNum > 0
    ? selected.currentStock + delta
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
              [{p.sku}] {p.name} — {fmt(p.currentStock, p.unit)} on hand
            </option>
          ))}
        </select>
      </div>

      {/* Current / projected stock card */}
      {selected && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 px-4 py-3 text-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-stone-500">Current stock</p>
            <p className={`font-semibold text-base ${selected.isLowStock ? 'text-red-600' : 'text-stone-900'}`}>
              {fmt(selected.currentStock, unit)}
              {selected.isLowStock && <span className="ml-1.5 text-xs font-normal text-red-500">⚠ low</span>}
            </p>
          </div>
          {newStock !== null && (
            <div className="text-right">
              <p className="text-xs text-stone-500">After adjustment</p>
              <p className={`font-semibold text-base ${newStock < 0 ? 'text-red-600' : newStock <= (selected.reorderPoint ?? 0) ? 'text-amber-700' : 'text-emerald-700'}`}>
                {fmt(Math.max(newStock, 0), unit)}
                {newStock < 0 && <span className="ml-1 text-xs font-normal"> (would go negative)</span>}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Direction */}
      <div>
        <label className="label">Direction <span className="text-red-500">*</span></label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio" name="direction" value="add"
              checked={direction === 'add'}
              onChange={() => setDirection('add')}
              className="accent-terracotta"
            />
            <span className="text-sm text-stone-700">Add stock (+)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio" name="direction" value="remove"
              checked={direction === 'remove'}
              onChange={() => setDirection('remove')}
              className="accent-terracotta"
            />
            <span className="text-sm text-stone-700">Remove stock (−)</span>
          </label>
        </div>
      </div>

      {/* Quantity input */}
      <div>
        <label className="label">
          Amount ({unitLbl}) <span className="text-red-500">*</span>
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
        <p className="text-xs text-stone-400 mt-1">Always enter a positive number — direction is set above.</p>
      </div>

      {/* Reason */}
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
