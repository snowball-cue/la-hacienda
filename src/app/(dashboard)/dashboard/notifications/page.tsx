import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth'
import { getNotifications, markNotificationsRead } from '@/actions/notifications'
import NotificationsClient from './NotificationsClient'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  // Mark all as read on page visit
  await markNotificationsRead()

  const result = await getNotifications()
  const notifications = result.success ? result.data : []

  return (
    <div className="p-6 lg:p-8 max-w-2xl space-y-4">
      <div>
        <h1 className="page-title">Notifications</h1>
        <p className="text-sm text-stone-500 mt-1">
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
        </p>
      </div>
      <NotificationsClient notifications={notifications} />
    </div>
  )
}
