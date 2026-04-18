'use client'

import { useActionState } from 'react'
import { changeUserModules } from '@/actions/settings'
import type { SettingsResult } from '@/actions/settings'

const MODULES = [
  { key: 'inventory',       label: 'Inventory'       },
  { key: 'purchase_orders', label: 'Purchase Orders' },
  { key: 'analytics',       label: 'Analytics'       },
  { key: 'reports',         label: 'Reports'         },
  { key: 'schedule',        label: 'Schedule'        },
  { key: 'timekeeping',     label: 'Timekeeping'     },
  { key: 'employees',       label: 'Employees'       },
  { key: 'payroll',         label: 'Payroll'         },
  { key: 'tasks',           label: 'Tasks'           },
  { key: 'suppliers',       label: 'Suppliers'       },
] as const

export default function ModuleAccessForm({
  userId,
  allowedModules,
}: {
  userId:         string
  allowedModules: string[]
}) {
  const action = changeUserModules.bind(null, userId)
  const [state, dispatch, isPending] = useActionState<SettingsResult | null, FormData>(action, null)

  const noRestriction = allowedModules.length === 0

  return (
    <form action={dispatch} className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
        {MODULES.map(m => (
          <label key={m.key} className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              name="allowedModules"
              value={m.key}
              defaultChecked={allowedModules.includes(m.key)}
              className="rounded border-stone-300 text-terracotta focus:ring-terracotta"
            />
            <span className="text-sm text-stone-700">{m.label}</span>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={isPending}
          className="btn-primary text-xs px-3 py-1.5"
        >
          {isPending ? 'Saving…' : 'Save Access'}
        </button>
        {state?.success && (
          <span className="text-xs text-emerald-600">Saved</span>
        )}
        {state && !state.success && (
          <span className="text-xs text-red-600">{state.error}</span>
        )}
        {noRestriction && (
          <span className="text-xs text-stone-400 ml-auto">
            All unchecked = full access
          </span>
        )}
      </div>
    </form>
  )
}
