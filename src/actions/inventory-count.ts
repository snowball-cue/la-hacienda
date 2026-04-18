'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'

export type CountResult<T = unknown> =
  | { success: true;  data: T }
  | { success: false; error: string }

export interface CountRow {
  id:          string
  storeId:     string
  storeName:   string
  status:      string
  notes:       string | null
  countedBy:   string
  completedAt: string | null
  createdAt:   string
  itemCount:   number
}

export interface CountItemRow {
  id:          string
  productId:   string
  productSku:  string
  productName: string
  unit:        string
  expectedQty: number
  countedQty:  number | null
  variance:    number | null
}

// ── List counts ───────────────────────────────────────────────────────────────

export async function getInventoryCounts(storeId?: string): Promise<CountResult<CountRow[]>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    // Use $queryRaw-safe approach via type assertion (pending migration)
    const counts = await (prisma as unknown as {
      inventoryCount: {
        findMany: (args: object) => Promise<Array<{
          id: string; storeId: string; status: string; notes: string | null
          countedBy: string; completedAt: Date | null; createdAt: Date
          store: { name: string }
          _count: { items: number }
        }>>
      }
    }).inventoryCount.findMany({
      where:   storeId ? { storeId } : undefined,
      include: { store: { select: { name: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return {
      success: true,
      data: counts.map(c => ({
        id:          c.id,
        storeId:     c.storeId,
        storeName:   c.store.name,
        status:      c.status,
        notes:       c.notes,
        countedBy:   c.countedBy,
        completedAt: c.completedAt?.toISOString() ?? null,
        createdAt:   c.createdAt.toISOString(),
        itemCount:   c._count.items,
      })),
    }
  } catch {
    return { success: false, error: 'Could not load inventory counts.' }
  }
}

// ── Get single count with items ────────────────────────────────────────────────

export async function getInventoryCount(id: string): Promise<CountResult<{
  count: CountRow
  items: CountItemRow[]
}>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const db = prisma as unknown as {
      inventoryCount: {
        findUnique: (args: object) => Promise<{
          id: string; storeId: string; status: string; notes: string | null
          countedBy: string; completedAt: Date | null; createdAt: Date
          store: { name: string }
          items: Array<{
            id: string; productId: string; expectedQty: number
            countedQty: number | null; variance: number | null
            product: { sku: string; name: string; unit: string }
          }>
        } | null>
      }
    }

    const count = await db.inventoryCount.findUnique({
      where:   { id },
      include: {
        store: { select: { name: true } },
        items: {
          include: { product: { select: { sku: true, name: true, unit: true } } },
          orderBy: [{ product: { name: 'asc' } }],
        },
      },
    })

    if (!count) return { success: false, error: 'Count not found.' }

    return {
      success: true,
      data: {
        count: {
          id:          count.id,
          storeId:     count.storeId,
          storeName:   count.store.name,
          status:      count.status,
          notes:       count.notes,
          countedBy:   count.countedBy,
          completedAt: count.completedAt?.toISOString() ?? null,
          createdAt:   count.createdAt.toISOString(),
          itemCount:   count.items.length,
        },
        items: count.items.map(i => ({
          id:          i.id,
          productId:   i.productId,
          productSku:  i.product.sku,
          productName: i.product.name,
          unit:        i.product.unit,
          expectedQty: i.expectedQty,
          countedQty:  i.countedQty,
          variance:    i.variance,
        })),
      },
    }
  } catch {
    return { success: false, error: 'Could not load count.' }
  }
}

// ── Start a new count ─────────────────────────────────────────────────────────

const StartCountSchema = z.object({
  storeId: z.string().uuid('Select a store.'),
  notes:   z.string().max(500).trim().nullable().optional(),
})

export async function startInventoryCount(
  _prev: CountResult | null,
  formData: FormData,
): Promise<CountResult<{ id: string }>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const parsed = StartCountSchema.safeParse({
    storeId: formData.get('storeId'),
    notes:   formData.get('notes') || null,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  try {
    // Get current stock levels for all active products
    const [products, stockGroups] = await Promise.all([
      prisma.product.findMany({
        where: { isActive: true },
        select: { id: true },
      }),
      prisma.stockLedger.groupBy({
        by:    ['productId'],
        _sum:  { changeQty: true },
        where: { storeId: parsed.data.storeId },
      }),
    ])

    const stockMap = new Map(
      stockGroups.map(g => [g.productId, Number(g._sum.changeQty ?? 0)]),
    )

    const db = prisma as unknown as {
      inventoryCount: {
        create: (args: object) => Promise<{ id: string }>
      }
    }

    const count = await db.inventoryCount.create({
      data: {
        storeId:   parsed.data.storeId,
        status:    'draft',
        notes:     parsed.data.notes ?? null,
        countedBy: user.id,
        items: {
          create: products.map(p => ({
            productId:   p.id,
            expectedQty: stockMap.get(p.id) ?? 0,
            countedQty:  null,
            variance:    null,
          })),
        },
      },
    })

    revalidatePath('/dashboard/inventory/counts')
    return { success: true, data: { id: count.id } }
  } catch {
    return { success: false, error: 'Failed to start inventory count.' }
  }
}

// ── Save a single item count ──────────────────────────────────────────────────

export async function saveCountItem(
  itemId: string,
  _prev: CountResult | null,
  formData: FormData,
): Promise<CountResult<void>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  const rawQty = formData.get('countedQty')
  const countedQty = rawQty !== '' && rawQty !== null ? Number(rawQty) : null

  try {
    const db = prisma as unknown as {
      inventoryCountItem: {
        update: (args: object) => Promise<{ expectedQty: number; countedQty: number | null }>
      }
    }

    const item = await db.inventoryCountItem.update({
      where: { id: itemId },
      data: {
        countedQty,
        variance: countedQty !== null ? countedQty - 0 : null, // will recalc below
      },
    })

    // Recalculate variance properly
    await db.inventoryCountItem.update({
      where: { id: itemId },
      data: {
        variance: countedQty !== null ? countedQty - item.expectedQty : null,
      },
    })

    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to save count.' }
  }
}

// ── Complete count — apply variances to stock ledger ─────────────────────────

export async function completeInventoryCount(
  countId: string,
): Promise<CountResult<void>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const db = prisma as unknown as {
      inventoryCount: {
        findUnique: (args: object) => Promise<{
          id: string; storeId: string; status: string
          items: Array<{ productId: string; variance: number | null }>
        } | null>
        update: (args: object) => Promise<unknown>
      }
    }

    const count = await db.inventoryCount.findUnique({
      where:   { id: countId },
      include: { items: { select: { productId: true, variance: true } } },
    })

    if (!count)              return { success: false, error: 'Count not found.' }
    if (count.status !== 'draft') return { success: false, error: 'Count already completed.' }

    // Create stock ledger entries for non-zero variances
    const adjustments = count.items.filter(i => i.variance !== null && i.variance !== 0)

    if (adjustments.length > 0) {
      await prisma.stockLedger.createMany({
        data: adjustments.map(i => ({
          productId:   i.productId,
          storeId:     count.storeId,
          changeQty:   i.variance!,
          reason:      'count_correction',
          note:        `Inventory count #${countId.slice(-6)}`,
          performedBy: user.id,
        })),
      })
    }

    await db.inventoryCount.update({
      where: { id: countId },
      data: {
        status:      'completed',
        completedBy: user.id,
        completedAt: new Date(),
      },
    })

    revalidatePath('/dashboard/inventory/counts')
    revalidatePath('/dashboard/inventory')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to complete inventory count.' }
  }
}
