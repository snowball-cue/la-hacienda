'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'

export type NotifResult<T = unknown> =
  | { success: true;  data: T }
  | { success: false; error: string }

export interface NotificationRow {
  id:        string
  type:      string
  title:     string
  message:   string
  isRead:    boolean
  link:      string | null
  createdAt: string
}

function toRow(n: {
  id: string; type: string; title: string; body: string
  isRead: boolean; link: string | null; createdAt: Date
}): NotificationRow {
  return {
    id:        n.id,
    type:      n.type,
    title:     n.title,
    message:   n.body,
    isRead:    n.isRead,
    link:      n.link,
    createdAt: n.createdAt.toISOString(),
  }
}

// ── getNotifications ──────────────────────────────────────────────────────────

export async function getNotifications(): Promise<NotifResult<NotificationRow[]>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized.' }

  try {
    const notifs = await prisma.notification.findMany({
      where:   { profileId: user.id },
      orderBy: { createdAt: 'desc' },
      take:    50,
      select:  { id: true, type: true, title: true, body: true, isRead: true, link: true, createdAt: true },
    })

    return { success: true, data: notifs.map(toRow) }
  } catch {
    return { success: false, error: 'Could not load notifications.' }
  }
}

// ── getUnreadCount ────────────────────────────────────────────────────────────

export async function getUnreadCount(): Promise<number> {
  const user = await getAuthUser()
  if (!user) return 0

  try {
    return await prisma.notification.count({
      where: { profileId: user.id, isRead: false },
    })
  } catch {
    return 0
  }
}

// ── markRead ──────────────────────────────────────────────────────────────────

export async function markNotificationsRead(): Promise<NotifResult<void>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized.' }

  try {
    await prisma.notification.updateMany({
      where: { profileId: user.id, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    })
    revalidatePath('/dashboard/notifications')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to mark notifications read.' }
  }
}

// ── generateComplianceAlerts ──────────────────────────────────────────────────
// Called by a cron-style mechanism or manually — generates notifications for:
// 1. Food handler certs expiring in ≤30 days
// 2. Low stock items

export async function generateComplianceAlerts(): Promise<NotifResult<{ created: number }>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    let created = 0
    const thirtyDaysOut = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Food handler cert expiries
    const profiles = await prisma.profile.findMany({
      where:  { isActive: true },
      select: { id: true, firstName: true, lastName: true, middleName: true, foodHandlerCertExpiry: true },
    })

    for (const p of profiles) {
      if (!p.foodHandlerCertExpiry) continue
      if (new Date(p.foodHandlerCertExpiry) > thirtyDaysOut) continue

      const daysLeft = Math.floor(
        (new Date(p.foodHandlerCertExpiry).getTime() - Date.now()) / 86_400_000
      )
      const expired = daysLeft < 0

      await prisma.notification.create({
        data: {
          type:      'compliance',
          title:     expired ? 'Food handler cert EXPIRED' : 'Food handler cert expiring soon',
          body:      expired
            ? `${formatEmployeeName(p.lastName, p.firstName, p.middleName)}'s food handler certification has expired. TX HSC §437.0241 requires renewal.`
            : `${formatEmployeeName(p.lastName, p.firstName, p.middleName)}'s food handler cert expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
          profileId: user.id,   // notify the requesting manager
          link:      '/dashboard/employees',
          isRead:    false,
        },
      })
      created++
    }

    // Low stock alerts
    const [products, stockGroups] = await Promise.all([
      prisma.product.findMany({
        where:  { isActive: true },
        select: { id: true, name: true, sku: true, reorderPoint: true },
      }),
      prisma.stockLedger.groupBy({ by: ['productId'], _sum: { changeQty: true } }),
    ])

    const stockMap = new Map(
      stockGroups.map(g => [g.productId, Number(g._sum.changeQty ?? 0)])
    )

    const lowStock = products.filter(p => (stockMap.get(p.id) ?? 0) <= p.reorderPoint)

    if (lowStock.length > 0) {
      await prisma.notification.create({
        data: {
          type:      'low_stock',
          title:     `${lowStock.length} item${lowStock.length > 1 ? 's' : ''} low on stock`,
          body:      lowStock.slice(0, 5).map(p => `${p.sku} ${p.name}`).join(', ')
            + (lowStock.length > 5 ? ` and ${lowStock.length - 5} more` : ''),
          profileId: user.id,
          link:      '/dashboard/reports',
          isRead:    false,
        },
      })
      created++
    }

    return { success: true, data: { created } }
  } catch {
    return { success: false, error: 'Failed to generate alerts.' }
  }
}
