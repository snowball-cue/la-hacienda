'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updatePurchaseOrder } from '@/actions/purchase-orders'

interface Props {
  orderId:       string
  notes:         string | null
  invoiceNumber: string | null
  invoiceDate:   string | null
}

export default function EditOrderButton({ orderId, notes, invoiceNumber, invoiceDate }: Props) {
  const router = useRouter()
  const [open,    setOpen]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = await updatePurchaseOrder(orderId, null, fd)
      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setError(null) }}
        className="btn-secondary text-sm"
      >
        Edit Order
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !isPending && setOpen(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-sm font-semibold text-stone-900">Edit Order Details</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Notes</label>
                <textarea
                  name="notes"
                  defaultValue={notes ?? ''}
                  rows={3}
                  placeholder="Internal notes about this order…"
                  className="input w-full resize-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Invoice #</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    defaultValue={invoiceNumber ?? ''}
                    placeholder="e.g. INV-1234"
                    className="input text-sm w-full"
                  />
                </div>
                <div>
                  <label className="label">Invoice Date</label>
                  <input
                    type="date"
                    name="invoiceDate"
                    defaultValue={invoiceDate ?? ''}
                    className="input text-sm w-full"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-sm"
                >
                  {isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
