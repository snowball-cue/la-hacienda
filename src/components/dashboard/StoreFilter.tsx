'use client'

import { useState, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'

interface Store { id: string; name: string }

interface Props {
  stores:   Store[]
  selected: string[]  // currently selected IDs from cookie (empty = all)
}

const COOKIE = 'lh-store-filter'
const ONE_YEAR = 60 * 60 * 24 * 365

function saveSelection(ids: string[]) {
  const val = ids.join(',')
  document.cookie = `${COOKIE}=${val}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`
}

export default function StoreFilter({ stores, selected }: Props) {
  const [open,    setOpen]    = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set(selected))
  const [, startTransition]   = useTransition()
  const router    = useRouter()
  const pathname  = usePathname()

  if (stores.length <= 1) return null   // nothing to filter

  const allSelected = checked.size === 0

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }

  function selectAll() { setChecked(new Set()) }

  function apply() {
    const ids = [...checked]
    saveSelection(ids)
    setOpen(false)
    startTransition(() => router.refresh())
  }

  const label = allSelected
    ? 'All stores'
    : checked.size === 1
      ? stores.find(s => checked.has(s.id))?.name ?? '1 store'
      : `${checked.size} stores`

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-md border border-stone-200 bg-white
                   px-3 py-1.5 text-sm font-medium text-stone-700
                   hover:bg-stone-50 transition-colors shadow-sm"
      >
        <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 8h12M9 12h6M12 16h0" />
        </svg>
        <span>{label}</span>
        <svg className={`w-3 h-3 text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1.5 z-40 w-52 rounded-xl border border-stone-200 bg-white shadow-lg py-1.5">

            {/* All stores */}
            <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50 cursor-pointer">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={selectAll}
                className="rounded border-stone-300 text-terracotta focus:ring-terracotta"
              />
              <span className="text-sm font-medium text-stone-700">All stores</span>
            </label>

            <div className="border-t border-stone-100 my-1" />

            {/* Individual stores */}
            {stores.map(s => (
              <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-stone-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked.has(s.id)}
                  onChange={() => toggle(s.id)}
                  className="rounded border-stone-300 text-terracotta focus:ring-terracotta"
                />
                <span className="text-sm text-stone-700 truncate">{s.name}</span>
              </label>
            ))}

            <div className="border-t border-stone-100 mt-1 pt-1 px-3 pb-1">
              <button
                onClick={apply}
                className="w-full btn-primary text-xs py-1.5"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
