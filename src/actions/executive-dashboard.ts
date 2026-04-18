'use server'

import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { currentWeekStart } from '@/lib/week-utils'

export interface ExecDashboardData {
  // ── Inventory value ──────────────────────────────────────────────────────
  totalCostValue:   number   // Σ(stock × costPrice)
  totalRetailValue: number   // Σ(stock × sellPrice)
  grossMarginPct:   number   // (retail - cost) / retail × 100
  totalSkus:        number
  activeSkus:       number
  lowStockCount:    number
  outOfStockCount:  number

  // ── Category breakdown ────────────────────────────────────────────────────
  categoryBreakdown: Array<{
    name:       string
    skuCount:   number
    stockValue: number  // Σ(stock × costPrice) for this category
    pct:        number  // % of total stock value
  }>

  // ── Top products by stock value ───────────────────────────────────────────
  topProductsByValue: Array<{
    name:        string
    sku:         string
    stockValue:  number
    currentStock: number
    unit:         string
    isLowStock:   boolean
  }>

  // ── Stock flow — last 30 days ─────────────────────────────────────────────
  stockFlow: {
    totalIn:        number  // Σ positive change_qty (received, returns)
    totalOut:       number  // Σ negative change_qty (sold, spoilage, etc.)
    receivedValue:  number  // Σ(qty × costPrice) for received entries
    adjustmentCount: number
    spoilageCount:  number
  }

  // ── Daily stock-in/out for last 14 days (sparkline data) ─────────────────
  dailyFlow: Array<{
    date:  string  // "YYYY-MM-DD"
    inQty: number
    outQty: number
  }>

  // ── Purchase orders ───────────────────────────────────────────────────────
  poSummary: {
    draft:     number
    sent:      number
    shipped:   number
    received:  number
    cancelled: number
  }
  inTransitValue: number  // Σ(qtyOrdered × unitCost) for shipped POs

  // ── Top suppliers by PO volume ────────────────────────────────────────────
  topSuppliers: Array<{
    name:     string
    poCount:  number
    totalSpend: number  // Σ(qtyOrdered × unitCost) across all received POs
  }>

  // ── Staff & schedule ──────────────────────────────────────────────────────
  staffSummary: {
    totalProfiles:   number
    totalEmployees:  number
    scheduledThisWeek: number   // total shift-hours scheduled for current week
    pendingTimeOff:  number
  }

  // ── Payroll ───────────────────────────────────────────────────────────────
  payrollSummary: {
    openPeriods:   number
    closedPeriods: number
    lastClosedEnd: string | null  // "YYYY-MM-DD"
  }

  generatedAt: string
}

export async function getExecutiveDashboardData(): Promise<
  { success: true; data: ExecDashboardData } | { success: false; error: string }
> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    const now      = new Date()
    const day30ago = new Date(now.getTime() - 30 * 86_400_000)
    const day14ago = new Date(now.getTime() - 14 * 86_400_000)
    const weekStart = currentWeekStart()

    // ── Run all queries in parallel ─────────────────────────────────────────
    const [
      products,
      stockGroups,
      movements30d,
      purchaseOrders,
      poItems,
      totalProfiles,
      activeProfiles,
      scheduleWeek,
      pendingTimeOff,
      payrollPeriods,
    ] = await Promise.all([
      prisma.product.findMany({
        where:  { isActive: true },
        select: {
          id: true, sku: true, name: true, unit: true,
          costPrice: true, sellPrice: true,
          reorderPoint: true,
          category: { select: { name: true } },
        },
      }),
      prisma.stockLedger.groupBy({
        by:   ['productId'],
        _sum: { changeQty: true },
      }),
      prisma.stockLedger.findMany({
        where:   { createdAt: { gte: day30ago } },
        select:  { changeQty: true, reason: true, createdAt: true, productId: true },
      }),
      prisma.purchaseOrder.findMany({
        select: { status: true },
      }),
      prisma.purchaseOrderItem.findMany({
        where: { purchaseOrder: { status: { in: ['shipped', 'received'] } } },
        select: {
          qtyOrdered: true, unitCost: true,
          purchaseOrder: {
            select: {
              status: true,
              supplier: { select: { name: true } },
            },
          },
        },
      }),
      prisma.profile.count(),
      prisma.profile.count({ where: { isActive: true } }),
      prisma.schedule.findMany({
        where: { weekStart: new Date(weekStart), isCancelled: false },
        select: { startTime: true, endTime: true },
      }),
      prisma.timeOffRequest.count({ where: { status: 'pending' } }),
      prisma.payrollPeriod.findMany({
        select: { status: true, periodEnd: true },
        orderBy: { periodEnd: 'desc' },
      }),
    ])

    // ── Build stock map ──────────────────────────────────────────────────────
    const stockMap = new Map(
      stockGroups.map(g => [g.productId, Number(g._sum.changeQty ?? 0)])
    )

    // ── Inventory value calculations ─────────────────────────────────────────
    let totalCostValue   = 0
    let totalRetailValue = 0
    let lowStockCount    = 0
    let outOfStockCount  = 0

    for (const p of products) {
      const stock = Math.max(stockMap.get(p.id) ?? 0, 0)
      const cost  = Number(p.costPrice ?? 0)
      const sell  = Number(p.sellPrice ?? 0)
      totalCostValue   += stock * cost
      totalRetailValue += stock * sell
      if (stock <= 0) outOfStockCount++
      else if (stock <= p.reorderPoint) lowStockCount++
    }

    const grossMarginPct = totalRetailValue > 0
      ? Math.round(((totalRetailValue - totalCostValue) / totalRetailValue) * 1000) / 10
      : 0

    // ── Category breakdown ───────────────────────────────────────────────────
    const catMap = new Map<string, { skuCount: number; stockValue: number }>()
    for (const p of products) {
      const stock = Math.max(stockMap.get(p.id) ?? 0, 0)
      const val   = stock * Number(p.costPrice ?? 0)
      const entry = catMap.get(p.category.name) ?? { skuCount: 0, stockValue: 0 }
      entry.skuCount++
      entry.stockValue += val
      catMap.set(p.category.name, entry)
    }
    const categoryBreakdown = [...catMap.entries()]
      .map(([name, d]) => ({
        name,
        skuCount:   d.skuCount,
        stockValue: Math.round(d.stockValue * 100) / 100,
        pct: totalCostValue > 0 ? Math.round((d.stockValue / totalCostValue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.stockValue - a.stockValue)

    // ── Top 8 products by stock value ────────────────────────────────────────
    const topProductsByValue = products
      .map(p => {
        const stock = stockMap.get(p.id) ?? 0
        return {
          name:         p.name,
          sku:          p.sku,
          stockValue:   Math.round(stock * Number(p.costPrice ?? 0) * 100) / 100,
          currentStock: Math.round(stock * 100) / 100,
          unit:         p.unit,
          isLowStock:   stock <= p.reorderPoint,
        }
      })
      .filter(p => p.stockValue > 0)
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 8)

    // ── Stock flow (last 30 days) ─────────────────────────────────────────────
    let totalIn = 0, totalOut = 0, adjustmentCount = 0, spoilageCount = 0
    for (const m of movements30d) {
      const qty = Number(m.changeQty)
      if (qty > 0) totalIn  += qty
      else         totalOut += Math.abs(qty)
      if (m.reason === 'adjustment' || m.reason === 'count_correction') adjustmentCount++
      if (m.reason === 'spoilage')  spoilageCount++
    }

    // ── Daily flow for last 14 days ───────────────────────────────────────────
    const movements14d = movements30d.filter(m => m.createdAt >= day14ago)
    const dailyMap = new Map<string, { inQty: number; outQty: number }>()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000)
      dailyMap.set(d.toISOString().slice(0, 10), { inQty: 0, outQty: 0 })
    }
    for (const m of movements14d) {
      const key = m.createdAt.toISOString().slice(0, 10)
      const entry = dailyMap.get(key)
      if (!entry) continue
      const qty = Number(m.changeQty)
      if (qty > 0) entry.inQty  += qty
      else         entry.outQty += Math.abs(qty)
    }
    const dailyFlow = [...dailyMap.entries()].map(([date, d]) => ({
      date,
      inQty:  Math.round(d.inQty  * 10) / 10,
      outQty: Math.round(d.outQty * 10) / 10,
    }))

    // ── PO summary ────────────────────────────────────────────────────────────
    const poSummary = { draft: 0, sent: 0, shipped: 0, received: 0, cancelled: 0 }
    for (const po of purchaseOrders) {
      const key = po.status as keyof typeof poSummary
      if (key in poSummary) poSummary[key]++
    }

    // In-transit value (shipped POs)
    let inTransitValue = 0
    let receivedValue  = 0
    const supplierSpend = new Map<string, { name: string; poCount: number; spend: number }>()
    for (const item of poItems) {
      const val = Number(item.qtyOrdered) * Number(item.unitCost ?? 0)
      if (item.purchaseOrder.status === 'shipped') inTransitValue += val
      if (item.purchaseOrder.status === 'received') {
        receivedValue += val
        const sName = item.purchaseOrder.supplier?.name ?? 'Unknown'
        const entry = supplierSpend.get(sName) ?? { name: sName, poCount: 0, spend: 0 }
        entry.spend  += val
        entry.poCount++
        supplierSpend.set(sName, entry)
      }
    }

    const topSuppliers = [...supplierSpend.values()]
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5)
      .map(s => ({
        name:       s.name,
        poCount:    s.poCount,
        totalSpend: Math.round(s.spend * 100) / 100,
      }))

    // ── Schedule hours this week ──────────────────────────────────────────────
    let scheduledThisWeek = 0
    for (const s of scheduleWeek) {
      if (!s.startTime || !s.endTime) continue
      const [sh, sm] = s.startTime.split(':').map(Number)
      const [eh, em] = s.endTime.split(':').map(Number)
      scheduledThisWeek += (eh * 60 + em - sh * 60 - sm) / 60
    }

    // ── Payroll ───────────────────────────────────────────────────────────────
    const openPeriods   = payrollPeriods.filter(p => p.status === 'open').length
    const closedPeriods = payrollPeriods.filter(p => p.status === 'closed').length
    const lastClosed    = payrollPeriods.find(p => p.status === 'closed')

    return {
      success: true,
      data: {
        totalCostValue:   Math.round(totalCostValue   * 100) / 100,
        totalRetailValue: Math.round(totalRetailValue * 100) / 100,
        grossMarginPct,
        totalSkus:   products.length,
        activeSkus:  products.length,
        lowStockCount,
        outOfStockCount,
        categoryBreakdown,
        topProductsByValue,
        stockFlow: {
          totalIn:        Math.round(totalIn  * 10) / 10,
          totalOut:       Math.round(totalOut * 10) / 10,
          receivedValue:  Math.round(receivedValue * 100) / 100,
          adjustmentCount,
          spoilageCount,
        },
        dailyFlow,
        poSummary,
        inTransitValue: Math.round(inTransitValue * 100) / 100,
        topSuppliers,
        staffSummary: {
          totalProfiles:     totalProfiles,
          totalEmployees:    activeProfiles,
          scheduledThisWeek: Math.round(scheduledThisWeek * 10) / 10,
          pendingTimeOff,
        },
        payrollSummary: {
          openPeriods,
          closedPeriods,
          lastClosedEnd: lastClosed?.periodEnd.toISOString().slice(0, 10) ?? null,
        },
        generatedAt: now.toISOString(),
      },
    }
  } catch (e) {
    console.error('[executive-dashboard]', e)
    return { success: false, error: 'Failed to load dashboard data.' }
  }
}
