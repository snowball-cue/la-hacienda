'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveCountItem, completeInventoryCount } from '@/actions/inventory-count'
import type { CountItemRow } from '@/actions/inventory-count'

interface Props {
  countId:    string
  items:      CountItemRow[]
  isReadOnly: boolean
}

export default function CountSheet({ countId, items, isReadOnly }: Props) {
  const router = useRouter()
  const [quantities, setQuantities] = useState<Record<string, string>>(
    Object.fromEntries(items.map(i => [i.id, i.countedQty != null ? String(i.countedQty) : '']))
  )
  const [saving, setSaving]       = useState<Record<string, boolean>>({})
  const [saved, setSaved]         = useState<Record<string, boolean>>({})
  const [completing, startComplete] = useTransition()
  const [completeError, setCompleteError] = useState<string | null>(null)

  const countedCount = items.filter(i => quantities[i.id] !== '').length
  const totalItems   = items.length
  const progress     = totalItems > 0 ? Math.round((countedCount / totalItems) * 100) : 0

  async function handleBlur(item: CountItemRow) {
    const val = quantities[item.id]
    setSaving(p => ({ ...p, [item.id]: true }))

    const fd = new FormData()
    fd.set('countedQty', val)
    const result = await saveCountItem(item.id, null, fd)

    setSaving(p => ({ ...p, [item.id]: false }))
    if (result.success) setSaved(p => ({ ...p, [item.id]: true }))
  }

  function handleComplete() {
    setCompleteError(null)
    startComplete(async () => {
      const result = await completeInventoryCount(countId)
      if (!result.success) {
        setCompleteError(result.error)
      } else {
        router.refresh()
      }
    })
  }

  const variances = items.filter(i => {
    const qty = quantities[i.id]
    if (qty === '') return false
    return Number(qty) !== i.expectedQty
  })

  return (
    <div className="space-y-4">

      {/* Progress */}
      {!isReadOnly && (
        <div className="card p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-stone-600">{countedCount} of {totalItems} items counted</span>
            <span className="font-medium text-stone-900">{progress}%</span>
          </div>
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-terracotta rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          {variances.length > 0 && (
            <p className="text-xs text-amber-600 mt-2">
              {variances.length} variance{variances.length > 1 ? 's' : ''} found
            </p>
          )}
        </div>
      )}

      {/* Count sheet table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Product</th>
                <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Expected</th>
                <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Counted</th>
                {!isReadOnly && <th className="px-4 py-3" />}
                <th className="text-right px-4 py-3 font-medium text-stone-500 text-xs uppercase tracking-wide">Variance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map(item => {
                const counted = quantities[item.id]
                const variance = counted !== '' ? Number(counted) - item.expectedQty : null
                const hasVariance = variance !== null && variance !== 0
                return (
                  <tr key={item.id} className={`hover:bg-stone-50 transition-colors ${hasVariance ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-2.5 text-stone-400 font-mono text-xs">{item.productSku}</td>
                    <td className="px-4 py-2.5 text-stone-900">{item.productName}</td>
                    <td className="px-4 py-2.5 text-right text-stone-500">
                      {item.expectedQty} <span className="text-stone-300">{item.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isReadOnly ? (
                        <span className={item.countedQty != null ? 'text-stone-900' : 'text-stone-300'}>
                          {item.countedQty ?? '—'}
                        </span>
                      ) : (
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={counted}
                          onChange={e => {
                            setQuantities(p => ({ ...p, [item.id]: e.target.value }))
                            setSaved(p => ({ ...p, [item.id]: false }))
                          }}
                          onBlur={() => handleBlur(item)}
                          className="input w-24 text-right text-sm py-1"
                          placeholder="—"
                        />
                      )}
                    </td>
                    {!isReadOnly && (
                      <td className="px-2 py-2.5 text-center w-6">
                        {saving[item.id] && <span className="text-xs text-stone-400">...</span>}
                        {saved[item.id] && !saving[item.id] && <span className="text-xs text-emerald-500">✓</span>}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right">
                      {variance !== null ? (
                        <span className={`font-medium ${variance > 0 ? 'text-emerald-600' : variance < 0 ? 'text-red-600' : 'text-stone-400'}`}>
                          {variance > 0 ? '+' : ''}{variance}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete action */}
      {!isReadOnly && (
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={handleComplete}
            disabled={completing || countedCount === 0}
            className="btn-primary"
          >
            {completing ? 'Completing…' : 'Complete Count & Apply Adjustments'}
          </button>
          {countedCount === 0 && (
            <p className="text-xs text-stone-400">Enter at least one quantity to complete.</p>
          )}
          {completeError && (
            <p className="text-sm text-red-600">{completeError}</p>
          )}
        </div>
      )}

      {isReadOnly && (
        <div className="card p-4 bg-emerald-50 border border-emerald-200">
          <p className="text-sm text-emerald-700">
            This count is complete. Stock adjustments have been applied to the ledger.
          </p>
        </div>
      )}
    </div>
  )
}
