'use client'

import Link from 'next/link'
import type { NotificationRow } from '@/actions/notifications'

const TYPE_ICON: Record<string, string> = {
  low_stock:   '📦',
  compliance:  '⚠',
  system:      'ℹ',
}

const TYPE_COLOR: Record<string, string> = {
  low_stock:  'border-l-amber-400',
  compliance: 'border-l-red-400',
  system:     'border-l-blue-400',
}

export default function NotificationsClient({
  notifications,
}: {
  notifications: NotificationRow[]
}) {
  if (notifications.length === 0) {
    return (
      <div className="card p-12 text-center text-stone-400 text-sm">
        No notifications. You're all caught up!
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {notifications.map(n => (
        <div
          key={n.id}
          className={`card p-4 border-l-4 ${TYPE_COLOR[n.type] ?? 'border-l-stone-300'}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">{TYPE_ICON[n.type] ?? 'ℹ'}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-stone-900 text-sm">{n.title}</p>
              <p className="text-xs text-stone-500 mt-0.5">{n.message}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-stone-400">
                  {new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
                {n.link && (
                  <Link href={n.link} className="text-xs text-terracotta hover:underline">
                    View →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
