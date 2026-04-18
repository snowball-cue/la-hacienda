import Link from 'next/link'

interface Props {
  label:       string
  sortKey:     string
  currentSort: string | null | undefined
  currentDir:  string | null | undefined
  pathname:    string
  params:      Record<string, string | undefined>
  className?:  string
  align?:      'left' | 'right' | 'center'
}

/**
 * A sortable <th> that generates a Link toggling sort direction.
 * Preserves all existing URL params (search, filter, etc.) — only replaces sort/dir.
 *
 * Usage (server component):
 *   const sp = await searchParams          // { sort?: string, dir?: string, search?: string }
 *   <SortableHeader
 *     label="Name" sortKey="name"
 *     currentSort={sp.sort} currentDir={sp.dir}
 *     pathname="/dashboard/employees"
 *     params={{ search: sp.search, show: sp.show }}
 *   />
 */
export default function SortableHeader({
  label, sortKey, currentSort, currentDir, pathname, params, className, align = 'left',
}: Props) {
  const isActive = currentSort === sortKey
  const nextDir  = isActive && currentDir === 'asc' ? 'desc' : 'asc'

  // Build URL, preserving all existing params
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') qs.set(k, v)
  }
  qs.set('sort', sortKey)
  qs.set('dir', nextDir)

  const href = `${pathname}?${qs.toString()}`

  const alignClass = align === 'right'
    ? 'justify-end'
    : align === 'center'
      ? 'justify-center'
      : 'justify-start'

  return (
    <th className={`px-4 py-3 text-xs font-medium text-stone-500 uppercase tracking-wide ${className ?? ''}`}>
      <Link
        href={href}
        className={`inline-flex items-center gap-1 group hover:text-stone-800 transition-colors ${alignClass}`}
      >
        {label}
        <span
          className={`text-[10px] transition-colors leading-none ${
            isActive ? 'text-terracotta' : 'text-stone-300 group-hover:text-stone-400'
          }`}
        >
          {isActive ? (currentDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </Link>
    </th>
  )
}
