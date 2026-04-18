'use client'

import type { DayEntry } from '@/actions/analytics'

export default function DailyFlowChart({ data }: { data: DayEntry[] }) {
  const maxQty = Math.max(...data.flatMap((d) => [d.inQty, d.outQty]), 1)
  const chartH = 96 // px

  // Only label every Nth date to avoid crowding
  const labelEvery = data.length <= 14 ? 2 : data.length <= 30 ? 5 : 10

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-3 text-xs text-stone-500 dark:text-stone-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400 inline-block" />
          Stock In
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-red-400 inline-block" />
          Stock Out
        </span>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-0.5" style={{ height: `${chartH}px` }}>
        {data.map((d) => {
          const inH  = maxQty > 0 ? Math.max(Math.round((d.inQty  / maxQty) * chartH), d.inQty  > 0 ? 2 : 0) : 0
          const outH = maxQty > 0 ? Math.max(Math.round((d.outQty / maxQty) * chartH), d.outQty > 0 ? 2 : 0) : 0
          return (
            <div
              key={d.date}
              className="flex-1 flex items-end gap-px group relative"
              title={`${d.date}\nIn: ${d.inQty.toFixed(1)}  Out: ${d.outQty.toFixed(1)}`}
            >
              <div
                className="flex-1 bg-emerald-400 dark:bg-emerald-500 rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ height: `${inH}px` }}
              />
              <div
                className="flex-1 bg-red-400 dark:bg-red-500 rounded-t-sm opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ height: `${outH}px` }}
              />
            </div>
          )
        })}
      </div>

      {/* Date labels */}
      <div className="flex mt-1" style={{ gap: '2px' }}>
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i % labelEvery === 0 && (
              <span className="text-[9px] text-stone-400 dark:text-stone-500">
                {d.date.slice(5)} {/* MM-DD */}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
