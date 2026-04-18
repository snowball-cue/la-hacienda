'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelOrder } from '@/actions/purchase-orders'

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const [open,    setOpen]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function confirm() {
    setError(null)
    startTransition(async () => {
      const result = await cancelOrder(orderId)
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
        type="button"
        onClick={() => { setOpen(true); setError(null) }}
        className="btn-secondary text-sm text-red-600 border-red-200 hover:border-red-400"
      >
        Cancel Order
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !pending && setOpen(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-stone-900">Cancel this order?</h2>
                <p className="text-sm text-stone-500 mt-1">
                  This will mark the order as cancelled. Items will not be received and stock will not be updated. This cannot be undone.
                </p>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="btn-secondary text-sm"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending}
                className="btn-primary text-sm bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
              >
                {pending ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
