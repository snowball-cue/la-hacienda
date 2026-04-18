'use client'

import { useActionState, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createSupplier, updateSupplier } from '@/actions/suppliers'
import { PAYMENT_TERMS } from '@/lib/supplier-constants'
import type { SupplierRow, SupplierResult } from '@/actions/suppliers'

const CURRENCIES      = ['USD', 'MXN', 'EUR', 'CAD']
const PAYMENT_METHODS = ['check', 'ach', 'credit_card', 'cod', 'prepaid']
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  check: 'Check', ach: 'ACH / Wire', credit_card: 'Credit Card', cod: 'COD', prepaid: 'Prepaid',
}

type SortKey = 'name' | 'contactName' | 'phone' | 'paymentTerms' | 'leadTimeDays' | 'isActive'

function SupplierForm({
  supplier,
  onClose,
}: {
  supplier?: SupplierRow
  onClose: () => void
}) {
  const action = supplier ? updateSupplier.bind(null, supplier.id) : createSupplier
  const [state, dispatch, isPending] = useActionState<SupplierResult | null, FormData>(action, null)

  useEffect(() => { if (state?.success) onClose() }, [state, onClose])

  const err = !state?.success ? state?.error : null

  return (
    <form action={dispatch} className="space-y-5 py-2">
      {err && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>}

      {/* ── Basic Info ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Basic Info</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Company Name <span className="text-red-500">*</span></label>
            <input name="name" required defaultValue={supplier?.name ?? ''} className="input w-full" />
          </div>
          <div>
            <label className="label">Contact Name</label>
            <input name="contactName" defaultValue={supplier?.contactName ?? ''} className="input w-full" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" type="tel" defaultValue={supplier?.phone ?? ''} className="input w-full" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" defaultValue={supplier?.email ?? ''} className="input w-full" />
          </div>
          <div>
            <label className="label">Ordering Email</label>
            <input name="orderingEmail" type="email" defaultValue={supplier?.orderingEmail ?? ''} placeholder="orders@supplier.com" className="input w-full" />
          </div>
          <div>
            <label className="label">Website</label>
            <input name="website" type="url" placeholder="https://…" defaultValue={supplier?.website ?? ''} className="input w-full" />
          </div>
          <div>
            <label className="label">Catalog / Price Sheet URL</label>
            <input name="catalogUrl" type="url" placeholder="https://…" defaultValue={supplier?.catalogUrl ?? ''} className="input w-full" />
          </div>
          <div>
            <label className="label">Tax ID / EIN</label>
            <input name="taxId" defaultValue={supplier?.taxId ?? ''} className="input w-full" placeholder="XX-XXXXXXX" />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <input name="address" defaultValue={supplier?.address ?? ''} className="input w-full" placeholder="Street, City, State ZIP" />
        </div>
      </section>

      {/* ── Commercial Terms ─────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Commercial Terms</p>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Payment Terms</label>
            <select name="paymentTerms" defaultValue={supplier?.paymentTerms ?? ''} className="input w-full">
              <option value="">— None —</option>
              {PAYMENT_TERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select name="paymentMethod" defaultValue={supplier?.paymentMethod ?? ''} className="input w-full">
              <option value="">— None —</option>
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Currency</label>
            <select name="currency" defaultValue={supplier?.currency ?? 'USD'} className="input w-full">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Account # (your acct with them)</label>
            <input name="accountNumber" defaultValue={supplier?.accountNumber ?? ''} placeholder="ACCT-1234" className="input w-full" />
          </div>
          <div>
            <label className="label">Min Order Amount ($)</label>
            <input name="minOrderAmount" type="number" min="0" step="0.01" defaultValue={supplier?.minOrderAmount ?? ''} placeholder="0.00" className="input w-full" />
          </div>
          <div>
            <label className="label">Free Delivery Threshold ($)</label>
            <input name="deliveryFeeThreshold" type="number" min="0" step="0.01" defaultValue={supplier?.deliveryFeeThreshold ?? ''} placeholder="0.00" className="input w-full" />
          </div>
        </div>
      </section>

      {/* ── Delivery & Ordering ──────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Delivery & Ordering</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Delivery Days</label>
            <input name="deliveryDays" defaultValue={supplier?.deliveryDays ?? ''} placeholder="e.g. Mon, Wed, Fri" className="input w-full" />
          </div>
          <div>
            <label className="label">Lead Time (days)</label>
            <input name="leadTimeDays" type="number" min="0" max="365" defaultValue={supplier?.leadTimeDays ?? ''} placeholder="e.g. 3" className="input w-full" />
          </div>
        </div>
        <div>
          <label className="label">Return Policy</label>
          <input name="returnPolicy" defaultValue={supplier?.returnPolicy ?? ''} placeholder="e.g. No returns on perishables. Dry goods within 14 days." className="input w-full" />
        </div>
      </section>

      {/* ── Status ───────────────────────────────────────────────── */}
      {supplier && (
        <section className="space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Status</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isActive" value="true" defaultChecked={supplier.isActive}
                  className="accent-terracotta" />
                <span className="text-sm text-stone-700">Active supplier</span>
              </label>
              <input type="hidden" name="isActive" value="false" />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="isApproved" value="true" defaultChecked={supplier.isApproved}
                  className="accent-terracotta" />
                <span className="text-sm text-stone-700">Approved for ordering</span>
              </label>
              <input type="hidden" name="isApproved" value="false" />
            </div>
            {!supplier.isActive && (
              <div>
                <label className="label">Deactivation Reason</label>
                <select name="deactivationReason" defaultValue={supplier.deactivationReason ?? ''} className="input w-full">
                  <option value="">— Select —</option>
                  <option value="out_of_business">Out of Business</option>
                  <option value="quality_issues">Quality Issues</option>
                  <option value="better_pricing">Found Better Pricing</option>
                  <option value="delivery_problems">Delivery Problems</option>
                  <option value="discontinued">Discontinued</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Notes ───────────────────────────────────────────────── */}
      <section>
        <label className="label">Notes</label>
        <textarea name="notes" rows={3} defaultValue={supplier?.notes ?? ''} placeholder="Delivery schedule, special instructions, etc." className="input w-full resize-none" />
      </section>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={isPending} className="btn-primary text-sm">
          {isPending ? 'Saving…' : supplier ? 'Save Changes' : 'Add Supplier'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary text-sm">Cancel</button>
      </div>
    </form>
  )
}

// ── SortButton (client-side, no URL params needed) ─────────────────────────────

function SortTh({
  label, sortKey, currentSort, currentDir, onSort, align = 'left',
}: {
  label: string
  sortKey: SortKey
  currentSort: SortKey
  currentDir: 'asc' | 'desc'
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) {
  const isActive = currentSort === sortKey
  return (
    <th
      className={`px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide cursor-pointer hover:text-stone-800 select-none text-${align}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] leading-none ${isActive ? 'text-terracotta' : 'text-stone-300'}`}>
          {isActive ? (currentDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function SupplierManager({ initialSuppliers }: { initialSuppliers: SupplierRow[] }) {
  const router = useRouter()
  const [suppliers]             = useState(initialSuppliers)
  const [editing, setEditing]   = useState<SupplierRow | null>(null)
  const [adding, setAdding]     = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [sortKey,  setSortKey]  = useState<SortKey>('name')
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('asc')

  const close = useCallback(() => {
    setEditing(null)
    setAdding(false)
    router.refresh()
  }, [router])

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const visible = [...(showInactive ? suppliers : suppliers.filter(s => s.isActive))]
    .sort((a, b) => {
      const aVal = a[sortKey] ?? ''
      const bVal = b[sortKey] ?? ''
      const cmp  = String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' })
      return sortDir === 'asc' ? cmp : -cmp
    })

  return (
    <div className="space-y-4">

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      {!adding && !editing && (
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setAdding(true)} className="btn-primary text-sm">+ Add Supplier</button>
          <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} className="accent-terracotta" />
            Show inactive
          </label>
          <span className="text-xs text-stone-400 ml-auto">
            {visible.length} supplier{visible.length !== 1 ? 's' : ''}
            {!showInactive && suppliers.filter(s => !s.isActive).length > 0 && (
              <> · {suppliers.filter(s => !s.isActive).length} inactive hidden</>
            )}
          </span>
        </div>
      )}

      {/* ── Add form ────────────────────────────────────────────── */}
      {adding && (
        <div className="card p-5 max-h-[80vh] overflow-y-auto">
          <h2 className="section-title mb-2">New Supplier</h2>
          <SupplierForm onClose={close} />
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────── */}
      {visible.length === 0 && !adding ? (
        <div className="card p-12 text-center text-stone-400 text-sm">
          {suppliers.length === 0
            ? 'No suppliers yet. Add one to link products to vendors.'
            : 'No active suppliers. Enable "Show inactive" to view all.'}
        </div>
      ) : !adding && !editing && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/60">
                  <SortTh label="Supplier"      sortKey="name"         currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortTh label="Contact"       sortKey="contactName"  currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortTh label="Phone"         sortKey="phone"        currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortTh label="Terms"         sortKey="paymentTerms" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <SortTh label="Lead"          sortKey="leadTimeDays" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} align="right" />
                  <SortTh label="Status"        sortKey="isActive"     currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {visible.map(s => (
                  <tr key={s.id} className={`hover:bg-stone-50/50 transition-colors ${!s.isActive ? 'opacity-55' : ''}`}>

                    {/* Supplier name + tags */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-900">{s.name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {s.paymentMethod && (
                          <span className="text-[10px] bg-stone-100 text-stone-500 rounded px-1.5 py-0.5">
                            {PAYMENT_METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod}
                          </span>
                        )}
                        {s.accountNumber && (
                          <span className="text-[10px] text-stone-400 font-mono">#{s.accountNumber}</span>
                        )}
                        {s.deliveryDays && (
                          <span className="text-[10px] text-stone-400">🚚 {s.deliveryDays}</span>
                        )}
                        {!s.isApproved && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">Not approved</span>
                        )}
                      </div>
                      {s.email && <p className="text-xs text-stone-400 mt-0.5">{s.email}</p>}
                      {s.website && (
                        <a href={s.website} target="_blank" rel="noreferrer" className="text-xs text-terracotta hover:underline">
                          Website ↗
                        </a>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3 text-stone-600">
                      {s.contactName ?? <span className="text-stone-300">—</span>}
                      {s.orderingEmail && (
                        <p className="text-xs text-stone-400 mt-0.5">Orders: {s.orderingEmail}</p>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-stone-600">
                      {s.phone
                        ? <a href={`tel:${s.phone}`} className="hover:text-terracotta">{s.phone}</a>
                        : <span className="text-stone-300">—</span>}
                    </td>

                    {/* Terms */}
                    <td className="px-4 py-3">
                      {s.paymentTerms
                        ? <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 rounded px-1.5 py-0.5">{s.paymentTerms}</span>
                        : <span className="text-stone-300">—</span>}
                      {s.minOrderAmount && (
                        <p className="text-xs text-stone-400 mt-0.5">Min: {s.currency} {s.minOrderAmount}</p>
                      )}
                      {s.deliveryFeeThreshold && (
                        <p className="text-xs text-stone-400">Free ship &gt;${s.deliveryFeeThreshold}</p>
                      )}
                    </td>

                    {/* Lead time */}
                    <td className="px-4 py-3 text-right text-stone-600">
                      {s.leadTimeDays != null
                        ? <span>{s.leadTimeDays}d</span>
                        : <span className="text-stone-300">—</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`badge text-[10px] uppercase ${s.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-500'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {!s.isActive && s.deactivationReason && (
                        <p className="text-[10px] text-stone-400 mt-0.5">{s.deactivationReason.replace(/_/g, ' ')}</p>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setEditing(s)} className="text-xs text-stone-500 hover:text-stone-900 hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Edit form ────────────────────────────────────────────── */}
      {editing && (
        <div className="card p-5 max-h-[80vh] overflow-y-auto">
          <h2 className="section-title mb-2">Edit — {editing.name}</h2>
          <SupplierForm supplier={editing} onClose={close} />
        </div>
      )}
    </div>
  )
}
