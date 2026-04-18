'use server'

import { prisma } from '@/lib/prisma'

export interface DayEntry {
  date: string   // 'YYYY-MM-DD'
  inQty: number
  outQty: number
}

export interface CategoryEntry {
  name: string
  inQty: number
  outQty: number
}

export interface TopProduct {
  name: string
  sku: string
  inQty: number
  outQty: number
}

export interface AnalyticsData {
  summary: {
    totalIn: number
    totalOut: number
    netChange: number
    activeProducts: number
    lowStockCount: number
    pendingPOs: number
  }
  dailyFlow: DayEntry[]
  categoryBreakdown: CategoryEntry[]
  topProducts: TopProduct[]
  poSummary: {
    draft: number
    sent: number
    shipped: number
    received: number
    cancelled: number
  }
}

export async function getAnalyticsData(
  from: Date,
  to: Date,
  storeIds?: string[],
): Promise<{ success: true; data: AnalyticsData } | { success: false; error: string }> {
  try {
    // Normalise: from = start of day, to = end of day
    const start = new Date(from)
    start.setHours(0, 0, 0, 0)
    const end = new Date(to)
    end.setHours(23, 59, 59, 999)

    const storeFilter = storeIds && storeIds.length > 0 ? { storeId: { in: storeIds } } : {}

    // Stock ledger entries in the period
    const ledgerEntries = await prisma.stockLedger.findMany({
      where: { createdAt: { gte: start, lte: end }, ...storeFilter },
      select: {
        changeQty: true,
        createdAt: true,
        product: {
          select: {
            name: true,
            sku: true,
            category: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Pre-populate every day in the range so days with no movement still appear
    const dayMap = new Map<string, { inQty: number; outQty: number }>()
    const cursor = new Date(start)
    while (cursor <= end) {
      dayMap.set(cursor.toISOString().slice(0, 10), { inQty: 0, outQty: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    const catMap  = new Map<string, { inQty: number; outQty: number }>()
    const prodMap = new Map<string, { name: string; sku: string; inQty: number; outQty: number }>()

    let totalIn = 0
    let totalOut = 0

    for (const entry of ledgerEntries) {
      const qty     = Number(entry.changeQty)
      const dateKey = entry.createdAt.toISOString().slice(0, 10)
      const catName = entry.product.category.name
      const prodKey = entry.product.sku

      // Daily flow
      const day = dayMap.get(dateKey) ?? { inQty: 0, outQty: 0 }
      if (qty > 0) { day.inQty  += qty;            totalIn  += qty            }
      else         { day.outQty += Math.abs(qty);   totalOut += Math.abs(qty)  }
      dayMap.set(dateKey, day)

      // Category
      const cat = catMap.get(catName) ?? { inQty: 0, outQty: 0 }
      if (qty > 0) cat.inQty  += qty
      else         cat.outQty += Math.abs(qty)
      catMap.set(catName, cat)

      // Product
      const prod = prodMap.get(prodKey) ?? { name: entry.product.name, sku: entry.product.sku, inQty: 0, outQty: 0 }
      if (qty > 0) prod.inQty  += qty
      else         prod.outQty += Math.abs(qty)
      prodMap.set(prodKey, prod)
    }

    // Active product count + low stock (always current snapshot, not date-filtered)
    const allProducts = await prisma.product.findMany({
      where:  { isActive: true },
      select: { id: true, reorderPoint: true, ledgerEntries: { select: { changeQty: true } } },
    })

    let lowStockCount = 0
    for (const p of allProducts) {
      const stock = p.ledgerEntries.reduce(
        (sum: number, e: { changeQty: unknown }) => sum + Number(e.changeQty), 0,
      )
      if (stock <= p.reorderPoint) lowStockCount++
    }

    // PO pipeline — current snapshot
    const pos = await prisma.purchaseOrder.groupBy({ by: ['status'], _count: { id: true } })
    const poSummary = { draft: 0, sent: 0, shipped: 0, received: 0, cancelled: 0 }
    for (const row of pos) {
      const s = row.status as keyof typeof poSummary
      if (s in poSummary) poSummary[s] = row._count.id
    }

    return {
      success: true,
      data: {
        summary: {
          totalIn:        Math.round(totalIn  * 10) / 10,
          totalOut:       Math.round(totalOut * 10) / 10,
          netChange:      Math.round((totalIn - totalOut) * 10) / 10,
          activeProducts: allProducts.length,
          lowStockCount,
          pendingPOs:     poSummary.sent + poSummary.shipped,
        },
        dailyFlow:         [...dayMap.entries()].map(([date, v]) => ({ date, ...v })),
        categoryBreakdown: [...catMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => (b.inQty + b.outQty) - (a.inQty + a.outQty)),
        topProducts:       [...prodMap.values()].sort((a, b) => (b.inQty + b.outQty) - (a.inQty + a.outQty)).slice(0, 8),
        poSummary,
      },
    }
  } catch {
    return { success: false, error: 'Failed to load analytics data.' }
  }
}
