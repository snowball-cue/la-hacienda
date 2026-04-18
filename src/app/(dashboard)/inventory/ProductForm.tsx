'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createProduct, updateProduct } from '@/actions/inventory'
import type { ProductRow, CategoryOption, SupplierOption, StoreOption, InventoryResult } from '@/actions/inventory'

const UNITS         = ['each', 'lb', 'kg', 'oz', 'case', 'dozen', 'bag']
const BARCODE_TYPES = ['UPC', 'EAN', 'PLU', 'QR', 'other']
const TAX_CATEGORIES = [
  { value: 'food_exempt', label: 'Food — Tax Exempt (TX)' },
  { value: 'standard',    label: 'Standard Rate' },
  { value: 'reduced',     label: 'Reduced Rate' },
]

interface Props {
  categories: CategoryOption[]
  suppliers:  SupplierOption[]
  stores:     StoreOption[]
  product?:   ProductRow
}

export default function ProductForm({ categories, suppliers, stores, product }: Props) {
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
            <label className="label">Brand</label>
            <input
              name="brand"
              defaultValue={product?.brand ?? ''}
              placeholder="e.g. La Costeña"
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">Country of Origin</label>
            <input
              name="countryOfOrigin"
              defaultValue={product?.countryOfOrigin ?? ''}
              placeholder="e.g. Mexico"
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

        <div>
          <label className="label">Store Location</label>
          <select name="storeId" defaultValue={product?.storeId ?? ''} className="input w-full">
            <option value="">All stores (not location-specific)</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.address}</option>
            ))}
          </select>
          <p className="text-xs text-stone-400 mt-1">Assign to a specific store, or leave blank for all stores</p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPerishable"
            name="isPerishable"
            value="true"
            defaultChecked={product?.isPerishable ?? false}
            className="accent-terracotta"
          />
          <label htmlFor="isPerishable" className="text-sm text-stone-700 cursor-pointer">
            Perishable item (requires temperature control / expiration tracking)
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Expiration Date</label>
            <input
              type="date"
              name="expirationDate"
              defaultValue={product?.expirationDate ?? ''}
              className="input w-full"
            />
            <p className="text-xs text-stone-400 mt-1">Current batch on-hand expiry (perishables only)</p>
          </div>
          <div>
            <label className="label">Shelf Life (days)</label>
            <input
              type="number"
              name="shelfLifeDays"
              defaultValue={product?.shelfLifeDays ?? ''}
              min={1}
              placeholder="e.g. 7"
              className="input w-full"
            />
            <p className="text-xs text-stone-400 mt-1">Typical days until expiry for this product</p>
          </div>
        </div>
      </div>

      {/* ── Barcode & Vendor ─────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h2 className="section-title">Barcode & Vendor IDs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Barcode</label>
            <input
              name="barcode"
              defaultValue={product?.barcode ?? ''}
              placeholder="e.g. 012345678901"
              className="input w-full"
            />
          </div>
          <div>
            <label className="label">Barcode Type</label>
            <select name="barcodeType" defaultValue={product?.barcodeType ?? ''} className="input w-full">
              <option value="">— None —</option>
              {BARCODE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Vendor SKU</label>
          <input
            name="vendorSku"
            defaultValue={product?.vendorSku ?? ''}
            placeholder="Supplier's product code"
            className="input w-full"
          />
        </div>
      </div>

      {/* ── Pricing ─────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h2 className="section-title">Pricing & Tax</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div>
            <label className="label">Tax Category</label>
            <select name="taxCategory" defaultValue={product?.taxCategory ?? ''} className="input w-full">
              <option value="">— None —</option>
              {TAX_CATEGORIES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
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
            <label className="label">Min Order Qty</label>
            <input
              name="minOrderQty"
              type="number"
              min="1"
              defaultValue={product?.minOrderQty ?? ''}
              placeholder="e.g. 12"
              className="input w-full"
            />
            <p className="text-xs text-stone-400 mt-1">Minimum to order</p>
          </div>
          <div>
            <label className="label">Case Pack Qty</label>
            <input
              name="casePackQty"
              type="number"
              min="1"
              defaultValue={product?.casePackQty ?? ''}
              placeholder="e.g. 24"
              className="input w-full"
            />
            <p className="text-xs text-stone-400 mt-1">Units per case</p>
          </div>
          <div>
            <label className="label">Weight (grams)</label>
            <input
              name="weightGrams"
              type="number"
              min="0"
              step="0.1"
              defaultValue={product?.weightGrams ?? ''}
              placeholder="e.g. 500"
              className="input w-full"
            />
            <p className="text-xs text-stone-400 mt-1">Per unit weight</p>
          </div>
        </div>
      </div>

      {/* ── Notes ───────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <h2 className="section-title">Notes</h2>
        <textarea
          name="productNotes"
          rows={3}
          defaultValue={product?.productNotes ?? ''}
          placeholder="Storage instructions, handling notes, etc."
          className="input w-full resize-none"
        />
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
