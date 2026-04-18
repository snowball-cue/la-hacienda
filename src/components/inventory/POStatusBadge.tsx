import type { POStatus } from '@/actions/purchase-orders'

const BADGE: Record<POStatus, string> = {
  draft:     'bg-stone-100 text-stone-600',
  sent:      'bg-blue-100 text-blue-800',
  shipped:   'bg-amber-100 text-amber-800',
  received:  'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-stone-100 text-stone-400 line-through',
}

const LABEL: Record<POStatus, string> = {
  draft:     'Draft',
  sent:      'Sent',
  shipped:   'In Transit',
  received:  'Received',
  cancelled: 'Cancelled',
}

export default function POStatusBadge({ status }: { status: POStatus }) {
  return (
    <span className={`badge text-[10px] uppercase tracking-wide ${BADGE[status] ?? 'bg-stone-100 text-stone-600'}`}>
      {LABEL[status] ?? status}
    </span>
  )
}
