/**
 * Inventory route loading skeleton.
 * Rendered instantly on navigation while products + categories load.
 */
export default function InventoryLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-6 lg:space-y-7 max-w-7xl mx-auto w-full">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-stone-200/60 animate-pulse" />
          <div className="h-9 w-40 rounded bg-stone-200/60 animate-pulse" />
          <div className="h-4 w-64 rounded bg-stone-200/60 animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded-lg bg-stone-200/60 animate-pulse" />
          <div className="h-10 w-32 rounded-lg bg-stone-200/60 animate-pulse" />
        </div>
      </div>

      {/* Tabs */}
      <div className="h-10 w-80 rounded-lg bg-stone-200/40 animate-pulse" />

      {/* Filter bar */}
      <div className="card p-4 flex gap-3">
        <div className="flex-1 h-9 rounded bg-stone-200/60 animate-pulse" />
        <div className="h-9 w-36 rounded bg-stone-200/60 animate-pulse" />
        <div className="h-9 w-32 rounded bg-stone-200/60 animate-pulse" />
        <div className="h-9 w-20 rounded bg-stone-200/60 animate-pulse" />
      </div>

      {/* Table rows */}
      <div className="card divide-y divide-stone-100 overflow-hidden">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <div className="h-10 w-10 rounded-lg bg-stone-200/60 animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 rounded bg-stone-200/60 animate-pulse" />
              <div className="h-3 w-32 rounded bg-stone-200/60 animate-pulse" />
            </div>
            <div className="h-6 w-16 rounded bg-stone-200/60 animate-pulse" />
          </div>
        ))}
      </div>

    </div>
  )
}
