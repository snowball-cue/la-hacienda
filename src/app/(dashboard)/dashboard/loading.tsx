/**
 * Dashboard route loading skeleton.
 *
 * Next.js App Router streams this in as a Suspense boundary while the
 * server component fetches data. The user sees the skeleton *immediately*
 * on navigation — real data pops in once queries finish.
 */
export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-6 lg:p-10 space-y-8 lg:space-y-10 max-w-7xl mx-auto w-full">

      {/* Hero skeleton */}
      <div className="card-hero p-6 md:p-10">
        <div className="h-3 w-20 rounded bg-stone-200/60 mb-3 animate-pulse" />
        <div className="h-10 w-64 rounded bg-stone-200/60 mb-3 animate-pulse" />
        <div className="h-4 w-80 rounded bg-stone-200/60 animate-pulse" />
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card p-4 sm:p-5 md:p-6">
            <div className="h-3 w-16 rounded bg-stone-200/60 mb-3 animate-pulse" />
            <div className="h-10 w-20 rounded bg-stone-200/60 mb-2 animate-pulse" />
            <div className="h-3 w-24 rounded bg-stone-200/60 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <div className="h-5 w-32 rounded bg-stone-200/60 mb-5 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} className="card p-4 flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-stone-200/60 animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-24 rounded bg-stone-200/60 animate-pulse" />
                <div className="h-3 w-16 rounded bg-stone-200/60 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
