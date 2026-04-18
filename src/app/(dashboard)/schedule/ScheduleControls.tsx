'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface Props {
  stores: Array<{ id: string; name: string }>
  currentStoreId?: string
  currentWeek: string   // 'YYYY-MM-DD' (Monday)
}

/** Returns the Monday of the week containing the given date string. */
function getMondayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return ''
  const day = d.getDay() // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

export default function ScheduleControls({ stores, currentStoreId, currentWeek }: Props) {
  const router = useRouter()
  const [jumpDate, setJumpDate] = useState('')

  function buildUrl(week: string, store?: string) {
    const params = new URLSearchParams()
    if (week) params.set('week', week)
    if (store) params.set('store', store)
    return `/dashboard/schedule?${params.toString()}`
  }

  function handleStoreChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const store = e.target.value || undefined
    router.push(buildUrl(currentWeek, store))
  }

  function handleJump() {
    if (!jumpDate) return
    const monday = getMondayOf(jumpDate)
    if (!monday) return
    router.push(buildUrl(monday, currentStoreId))
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 card">
      {/* Store filter */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-stone-500 whitespace-nowrap">Store</label>
        <select
          value={currentStoreId ?? ''}
          onChange={handleStoreChange}
          className="input text-sm py-1.5"
        >
          <option value="">All stores</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="hidden sm:block h-5 w-px bg-stone-200" />

      {/* Jump to date */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-stone-500 whitespace-nowrap">Jump to</label>
        <input
          type="date"
          value={jumpDate}
          onChange={e => setJumpDate(e.target.value)}
          className="input text-sm py-1.5 w-36"
        />
        <button
          onClick={handleJump}
          disabled={!jumpDate}
          className="btn-secondary text-xs px-3 py-1.5"
        >
          Go
        </button>
      </div>
    </div>
  )
}
