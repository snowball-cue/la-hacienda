'use client'

import { useActionState, useEffect, useState } from 'react'
import { createSupplier, updateSupplier } from '@/actions/suppliers'
import type { SupplierRow, SupplierResult } from '@/actions/suppliers'

function SupplierForm({
  supplier,
  onClose,
}: {
  supplier?: SupplierRow
  onClose: () => void
}) {
  const action = supplier ? updateSupplier.bind(null, supplier.id) : createSupplier
  const [state, dispatch, isPending] = useActionState<SupplierResult | null, FormData>(action, null)

  useEffect(() => {
    if (state?.success) onClose()
  }, [state, onClose])

  const err = !state?.success ? state?.error : null

  return (
    <form action={dispatch} className="space-y-4 py-4">
      {err && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{err}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={supplier?.notes ?? ''}
          placeholder="Delivery schedule, minimums, etc."
          className="input w-full resize-none"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={isPending} className="btn-primary text-sm">
          {isPending ? 'Saving…' : supplier ? 'Save Changes' : 'Add Supplier'}
        </button>
        <button type="button" onClick={onClose} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function SupplierManager({
  initialSuppliers,
}: {
  initialSuppliers: SupplierRow[]
}) {
  const [suppliers, setSuppliers] = useState(initialSuppliers)
  const [editing, setEditing]     = useState<SupplierRow | null>(null)
  const [adding, setAdding]       = useState(false)

  function close() {
    setEditing(null)
    setAdding(false)
    // Refresh happens via revalidatePath on the server action
  }

  return (
    <div className="space-y-4">

      {/* ── Add button ──────────────────────────────────────────────── */}
      {!adding && !editing && (
        <button onClick={() => setAdding(true)} className="btn-primary text-sm">
          + Add Supplier
        </button>
      )}

      {/* ── Add form ────────────────────────────────────────────────── */}
      {adding && (
        <div className="card p-5">
          <h2 className="section-title mb-2">New Supplier</h2>
          <SupplierForm onClose={close} />
        </div>
      )}

      {/* ── Supplier list ────────────────────────────────────────────── */}
      {suppliers.length === 0 && !adding ? (
        <div className="card p-12 text-center text-stone-400 text-sm">
          No suppliers yet. Add one to link products to vendors.
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((s) => (
            <div key={s.id} className="card p-4">
              {editing?.id === s.id ? (
                <>
                  <h3 className="section-title mb-2">Edit — {s.name}</h3>
                  <SupplierForm supplier={s} onClose={close} />
                </>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-stone-900">{s.name}</p>
                    {s.contactName && (
                      <p className="text-sm text-stone-500">{s.contactName}</p>
                    )}
                    <div className="flex flex-wrap gap-x-4 mt-1 text-xs text-stone-400">
                      {s.phone && <span>📞 {s.phone}</span>}
                      {s.email && <span>✉ {s.email}</span>}
                    </div>
                    {s.notes && (
                      <p className="mt-1 text-xs text-stone-400 italic">{s.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setEditing(s)}
                    className="text-xs text-stone-500 hover:text-stone-900 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
