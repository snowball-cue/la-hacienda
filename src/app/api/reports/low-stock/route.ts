import { NextResponse } from 'next/server'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const [products, stockGroups] = await Promise.all([
    prisma.product.findMany({
      where:   { isActive: true },
      include: { category: true, supplier: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    }),
    prisma.stockLedger.groupBy({
      by:   ['productId'],
      _sum: { changeQty: true },
    }),
  ])

  const stockMap = new Map(stockGroups.map((g) => [g.productId, Number(g._sum.changeQty ?? 0)]))

  const rows = products
    .map((p) => ({ ...p, currentStock: stockMap.get(p.id) ?? 0 }))
    .filter((p) => p.currentStock <= p.reorderPoint)
    .sort((a, b) => (a.currentStock - a.reorderPoint) - (b.currentStock - b.reorderPoint))

  const header = ['SKU', 'Name', 'Name (ES)', 'Category', 'Supplier', 'Unit', 'Current Stock', 'Reorder At', 'Shortage', 'Order Qty']
  const lines  = [
    header.join(','),
    ...rows.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${(p.nameEs ?? '').replace(/"/g, '""')}"`,
      `"${p.category.name}"`,
      `"${(p.supplier?.name ?? '').replace(/"/g, '""')}"`,
      p.unit,
      p.currentStock,
      p.reorderPoint,
      p.reorderPoint - p.currentStock,
      p.reorderQty,
    ].join(',')),
  ]

  const date = new Date().toISOString().slice(0, 10)
  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="low-stock-${date}.csv"`,
    },
  })
}
