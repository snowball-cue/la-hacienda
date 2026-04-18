'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createProduct, updateProduct } from '@/actions/inventory'
import type { ProductRow, CategoryOption, SupplierOption, InventoryResult } from '@/actions/inventory'

const UNITS = ['each', 'lb', 'kg', 'oz', 'case', 'dozen', 'bag']

interface Props {
  categories: CategoryOption[]
  suppliers:  SupplierOption[]
  product?:   ProductRow   // If provided, editing; otherwise creating
}

export default function ProductForm({ categories, suppliers, product }: Props) {
  const router = useRouter()

  const action = product
    ? updateProduct.bind(null, product.id)
    : createProduct

  const [state, dispatch, isPending] = useActionState<InventoryResult | null, FormData>(
    action,
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
    <form action={dispatch} className="space-y-6">

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      {/* ── Identity ────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h2 className="section-title">Product Identity</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">SKU <span className="text-red-500">*</span></label>
            <input
              name="sku"
              defaultValue={product?.sku ?? ''}
              required
              placeholder="e.g. PRD-AVO-001"
              className="input w-full uppercase"
            />
          </div>
          <div>
            <label className="label">Category <span className="text-red-500">*</span></label>
            <select name="categoryId" defaultValue={product?.categoryId ?? ''} required className="input w-full">
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name} · {c.nameEs}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Name (English) <span className="text-red-500">*</span></label>
            <input
              name="name"
              defaultValue={product?.name ?? ''}
              required
              placeholder="e.g. Avocado"
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">Nombre (Español)</label>
            <input
              name="nameEs"
              defaultValue={product?.nameEs ?? ''}
              placeholder="e.g. Aguacate"
              className="input w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Unit of Measure <span className="text-red-500">*</span></label>
            <select name="unit" defaultValue={product?.unit ?? 'each'} required className="input w-full">
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Supplier</label>
            <select name="supplierId" defaultValue={product?.supplierId ?? ''} className="input w-full">
              <option value="">No supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h2 className="section-title">Pricing</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Cost Price ($)</label>
            <input
              name="costPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.costPrice ?? ''}
              placeholder="0.00"
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">Sell Price ($)</label>
            <input
              name="sellPrice"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.sellPrice ?? ''}
              placeholder="0.00"
              className="input w-full"
            />
          </div>
        </div>
      </div>

      {/* ── Stock settings ───────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h2 className="section-title">Stock Settings</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Reorder Point</label>
            <input
              name="reorderPoint"
              type="number"
              min="0"
              defaultValue={product?.reorderPoint ?? 0}
              className="input w-full"
            />
            <p className="text-xs text-stone-400 mt-1">Alert when stock ≤ this</p>
          </div>
          <div>
            <label className="label">Reorder Qty</label>
            <input
              name="reorderQty"
              type="number"
              min="0"
              defaultValue={product?.reorderQty ?? 0}
              className="input w-full"
            />
            <p className="text-xs text-stone-400 mt-1">Suggested order amount</p>
          </div>
          <div>
            <label className="label">Shelf Life (days)</label>
            <input
              name="shelfLifeDays"
              type="number"
              min="1"
              defaultValue={product?.shelfLifeDays ?? ''}
              placeholder="e.g. 7"
              className="input w-full"
            />
            <p className="text-xs text-stone-400 mt-1">Leave blank if N/A</p>
          </div>
        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Saving…' : product ? 'Save Changes' : 'Add Product'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>

    </form>
  )
}
