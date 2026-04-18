'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

const PRESETS = [
  { label: '7d',  days: 7  },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
]

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10)
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toYMD(d)
}

export default function DateRangeSelector({
  currentFrom,
  currentTo,
}: {
  currentFrom: string   // 'YYYY-MM-DD'
  currentTo:   string   // 'YYYY-MM-DD'
}) {
  const router   = useRouter()
  const pathname = usePathname()

  const today = toYMD(new Date())

  const [from, setFrom] = useState(currentFrom)
  const [to,   setTo]   = useState(currentTo)

  function navigate(f: string, t: string) {
    router.push(`${pathname}?from=${f}&to=${t}`)
  }

  function applyCustom() {
    if (!from || !to || from > to) return
    navigate(from, to)
  }

  // Which preset is active (if any)?
  const activePreset = PRESETS.find((p) => {
    const expected = daysAgo(p.days)
    return currentFrom === expected && currentTo === today
  })

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">

      {/* ── Preset buttons ─────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-1">
        {PRESETS.map((p) => (
          <button
            key={p.days}
            onClick={() => {
              const f = daysAgo(p.days)
              setFrom(f)
              setTo(today)
              navigate(f, today)
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activePreset?.days === p.days
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Date range pickers ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-stone-500 font-medium whitespace-nowrap">From</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="input py-1.5 text-xs w-36"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-xs text-stone-500 font-medium whitespace-nowrap">To</label>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className="input py-1.5 text-xs w-36"
          />
        </div>
        <button
          onClick={applyCustom}
          disabled={!from || !to || from > to}
          className="btn-primary py-1.5 text-xs px-4"
        >
          Apply
        </button>
      </div>

    </div>
  )
}
