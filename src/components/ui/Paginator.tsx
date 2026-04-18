import Link from 'next/link'

const PAGE_SIZES = [25, 50, 100, 150, 200] as const

interface Props {
  page:      number
  perPage:   number
  total:     number
  /** Returns the URL for a given page + perPage combination */
  buildHref: (page: number, perPage: number) => string
  noun?:     string
}

export default function Paginator({ page, perPage, total, buildHref, noun = 'items' }: Props) {
  if (total === 0) return null

  const pageCount = Math.ceil(total / perPage)
  const start     = (page - 1) * perPage + 1
  const end       = Math.min(page * perPage, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">

      {/* Showing X–Y of Z */}
      <p className="text-xs text-stone-500">
        Showing {start}–{end} of {total} {noun}
      </p>

      <div className="flex items-center gap-4 flex-wrap">

        {/* Per-page selector */}
        <div className="flex items-center gap-0.5">
          <span className="text-xs text-stone-400 mr-1.5">Show:</span>
          {PAGE_SIZES.map(size => (
            <Link
              key={size}
              href={buildHref(1, size)}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                perPage === size
                  ? 'bg-terracotta text-white'
                  : 'text-stone-500 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {size}
            </Link>
          ))}
        </div>

        {/* Page navigation */}
        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            {page > 1 ? (
              <Link href={buildHref(page - 1, perPage)} className="text-xs px-2 py-1 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors">
                ← Prev
              </Link>
            ) : (
              <span className="text-xs px-2 py-1 text-stone-300 select-none">← Prev</span>
            )}

            <span className="text-xs text-stone-500 px-2 tabular-nums">
              {page} / {pageCount}
            </span>

            {page < pageCount ? (
              <Link href={buildHref(page + 1, perPage)} className="text-xs px-2 py-1 rounded text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors">
                Next →
              </Link>
            ) : (
              <span className="text-xs px-2 py-1 text-stone-300 select-none">Next →</span>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
