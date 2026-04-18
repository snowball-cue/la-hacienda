'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

// ── Types ────────────────────────────────────────────────────────────────────

export type StockResult<T = unknown> =
  | { success: true;  data: T }
  | { success: false; error: string }

export interface StockEntryRow {
  id:          string
  productId:   string
  productName: string
  productSku:  string
  storeId:     string | null
  changeQty:   string
  reason:      string
  note:        string | null
  performedBy: string
  createdAt:   string
}

// ── Schemas ──────────────────────────────────────────────────────────────────

const ReceiveSchema = z.object({
  productId: z.string().uuid('Select a product.'),
  qty:       z.coerce.number().positive('Quantity must be greater than zero.'),
  storeId:   z.string().uuid().optional().nullable(),
  note:      z.string().max(500).trim().optional(),
})

const AdjustSchema = z.object({
  productId: z.string().uuid('Select a product.'),
  qty:       z.coerce.number().positive('Quantity must be greater than zero.'),
  direction: z.enum(['add', 'remove']),
  reason:    z.enum(['spoilage', 'theft', 'return', 'count_correction', 'adjustment']),
  storeId:   z.string().uuid().optional().nullable(),
  note:      z.string().max(500).trim().optional(),
})

// ── Helper ───────────────────────────────────────────────────────────────────

function serialiseEntry(
  e: {
    id: string; productId: string; storeId: string | null; changeQty: unknown;
    reason: string; note: string | null; performedBy: string; createdAt: Date
    product: { name: string; sku: string }
  },
): StockEntryRow {
  return {
    id:          e.id,
    productId:   e.productId,
    productName: e.product.name,
    productSku:  e.product.sku,
    storeId:     e.storeId,
    changeQty:   String(e.changeQty),
    reason:      e.reason,
    note:        e.note,
    performedBy: e.performedBy,
    createdAt:   e.createdAt.toISOString(),
  }
}

/**
 * Resolve storeId for a ledger entry:
 * 1. Use explicitly supplied storeId (from form)
 * 2. Fall back to user's assigned store
 * 3. Fall back to null (cross-store / legacy)
 */
async function resolveStoreId(
  formStoreId: string | null | undefined,
  userId: string,
): Promise<string | null> {
  if (formStoreId) return formStoreId
  const profile = await prisma.profile.findUnique({
    where:  { id: userId },
    select: { storeId: true },
  })
  return profile?.storeId ?? null
}

// ── receiveGoods ──────────────────────────────────────────────────────────────

export async function receiveGoods(
  _prev: StockResult | null,
  formData: FormData,
): Promise<StockResult<StockEntryRow>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized.' }

  const parsed = ReceiveSchema.safeParse({
    productId: formData.get('productId'),
    qty:       formData.get('qty'),
    storeId:   formData.get('storeId') || null,
    note:      formData.get('note') || undefined,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const storeId = await resolveStoreId(parsed.data.storeId, user.id)

  try {
    const entry = await prisma.stockLedger.create({
      data: {
        productId:   parsed.data.productId,
        storeId,
        changeQty:   parsed.data.qty,
        reason:      'received',
        note:        parsed.data.note ?? null,
        performedBy: user.id,
      },
      include: { product: true },
    })
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')
    return { success: true, data: serialiseEntry(entry) }
  } catch {
    return { success: false, error: 'Failed to record receipt.' }
  }
}

// ── adjustStock ───────────────────────────────────────────────────────────────

export async function adjustStock(
  _prev: StockResult | null,
  formData: FormData,
): Promise<StockResult<StockEntryRow>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized.' }

  const parsed = AdjustSchema.safeParse({
    productId: formData.get('productId'),
    qty:       formData.get('qty'),
    direction: formData.get('direction'),
    reason:    formData.get('reason'),
    storeId:   formData.get('storeId') || null,
    note:      formData.get('note') || undefined,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' }
  }

  const changeQty = parsed.data.direction === 'remove'
    ? -parsed.data.qty
    : parsed.data.qty

  const storeId = await resolveStoreId(parsed.data.storeId, user.id)

  try {
    const entry = await prisma.stockLedger.create({
      data: {
        productId:   parsed.data.productId,
        storeId,
        changeQty,
        reason:      parsed.data.reason,
        note:        parsed.data.note ?? null,
        performedBy: user.id,
      },
      include: { product: true },
    })
    revalidatePath('/dashboard/inventory')
    revalidatePath('/dashboard')
    return { success: true, data: serialiseEntry(entry) }
  } catch {
    return { success: false, error: 'Failed to record adjustment.' }
  }
}

// ── getStockLevel ─────────────────────────────────────────────────────────────

/**
 * Get current stock level for a product.
 * If storeId is provided, returns per-store stock.
 * If storeId is null, returns aggregate across all stores.
 */
export async function getStockLevel(
  productId: string,
  storeId?: string | null,
): Promise<number> {
  const result = await prisma.stockLedger.aggregate({
    where: {
      productId,
      ...(storeId ? { storeId } : {}),
    },
    _sum: { changeQty: true },
  })
  return Number(result._sum.changeQty ?? 0)
}

// ── getRecentActivity ─────────────────────────────────────────────────────────

export async function getRecentActivity(
  limit = 20,
  storeId?: string | null,
): Promise<StockResult<StockEntryRow[]>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized.' }

  try {
    const entries = await prisma.stockLedger.findMany({
      where:   storeId ? { storeId } : undefined,
      take:    limit,
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, sku: true } } },
    })
    return { success: true, data: entries.map(serialiseEntry) }
  } catch {
    return { success: false, error: 'Could not load activity.' }
  }
}

// ── getStockHistory ───────────────────────────────────────────────────────────

export async function getStockHistory(
  productId: string,
  storeId?: string | null,
): Promise<StockResult<StockEntryRow[]>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized.' }

  try {
    const entries = await prisma.stockLedger.findMany({
      where: {
        productId,
        ...(storeId ? { storeId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { name: true, sku: true } } },
    })
    return { success: true, data: entries.map(serialiseEntry) }
  } catch {
    return { success: false, error: 'Could not load history.' }
  }
}
