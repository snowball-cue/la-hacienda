'use client'

import { useActionState, useRef } from 'react'
import { importProducts } from '@/actions/inventory'
import type { InventoryResult, ImportResult } from '@/actions/inventory'

export default function ImportForm() {
  const [state, dispatch, isPending] = useActionState<InventoryResult<ImportResult> | null, FormData>(
    importProducts,
    null,
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const result  = state?.success ? state.data   : null
  const err     = !state?.success ? state?.error : null
  const hasRows = result && (result.created > 0 || result.skipped > 0 || result.errors.length > 0)

  return (
    <div className="space-y-6">

      {/* ── Template download ──────────────────────────────────────────── */}
      <div className="card p-5">
        <h2 className="section-title mb-2">CSV Format</h2>
        <p className="text-sm text-stone-500 mb-3">
          Your file must have a header row with these columns (order does not matter):
        </p>
        <div className="overflow-x-auto">
          <table className="text-xs text-stone-600 w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-1.5 pr-4 font-semibold text-stone-700">Column</th>
                <th className="text-left py-1.5 pr-4 font-semibold text-stone-700">Required?</th>
                <th className="text-left py-1.5 font-semibold text-stone-700">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {[
                ['sku',            'Yes', 'Unique identifier, e.g. AVOC-001'],
                ['name',           'Yes', 'English product name'],
                ['category',       'Yes', 'Must exactly match an existing category name'],
                ['unit',           'Yes', 'each · lb · kg · oz · case · bag'],
                ['name_es',        'No',  'Spanish product name'],
                ['supplier',       'No',  'Must exactly match an existing supplier name'],
                ['cost_price',     'No',  'Number, e.g. 1.50'],
                ['sell_price',     'No',  'Number, e.g. 2.99'],
                ['reorder_point',  'No',  'Integer, defaults to 0'],
                ['reorder_qty',    'No',  'Integer, defaults to 0'],
                ['shelf_life_days','No',  'Integer, days until expiry'],
              ].map(([col, req, note]) => (
                <tr key={col}>
                  <td className="py-1.5 pr-4 font-mono text-stone-800">{col}</td>
                  <td className="py-1.5 pr-4">{req}</td>
                  <td className="py-1.5 text-stone-400">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-stone-400 mt-3">
          Rows with duplicate SKUs are silently skipped (not overwritten).
        </p>
      </div>

      {/* ── Upload form ────────────────────────────────────────────────── */}
      <form action={dispatch} className="card p-5 space-y-4">
        <h2 className="section-title">Upload File</h2>

        {err && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div>
          <label className="label">CSV File <span className="text-red-500">*</span></label>
          <input
            ref={fileRef}
            name="file"
            type="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-stone-600
              file:mr-3 file:py-2 file:px-4
              file:rounded-md file:border file:border-stone-200
              file:text-sm file:font-medium file:bg-stone-50
              file:text-stone-700 file:cursor-pointer
              hover:file:bg-stone-100"
          />
        </div>

        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? 'Importing…' : 'Import Products'}
        </button>
      </form>

      {/* ── Results ────────────────────────────────────────────────────── */}
      {hasRows && (
        <div className="card p-5 space-y-4">
          <h2 className="section-title">Import Results</h2>

          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
              <span className="text-sm font-medium text-stone-700">
                {result.created} product{result.created !== 1 ? 's' : ''} created
              </span>
            </div>
            {result.skipped > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shrink-0" />
                <span className="text-sm text-stone-500">
                  {result.skipped} duplicate SKU{result.skipped !== 1 ? 's' : ''} skipped
                </span>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-sm text-red-600">
                  {result.errors.length} row{result.errors.length !== 1 ? 's' : ''} failed
                </span>
              </div>
            )}
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 mb-2">Row errors:</p>
              {result.errors.map(({ row, message }) => (
                <p key={row} className="text-xs text-red-600">
                  Row {row}: {message}
                </p>
              ))}
            </div>
          )}

          {result.created > 0 && (
            <a href="/dashboard/inventory" className="btn-primary text-sm inline-block">
              View Inventory →
            </a>
          )}
        </div>
      )}

    </div>
  )
}
