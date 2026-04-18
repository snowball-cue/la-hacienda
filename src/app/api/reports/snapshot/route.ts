import { type NextRequest, NextResponse } from 'next/server'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const categoryId = req.nextUrl.searchParams.get('category') ?? undefined

  const [products, stockGroups] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        ...(categoryId && { categoryId }),
      },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    }),
    prisma.stockLedger.groupBy({
      by:   ['productId'],
      _sum: { changeQty: true },
    }),
  ])

  const stockMap = new Map(stockGroups.map((g) => [g.productId, Number(g._sum.changeQty ?? 0)]))

  const rows = products.map((p) => {
    const stock    = stockMap.get(p.id) ?? 0
    const cost     = p.costPrice  != null ? Number(p.costPrice)  : null
    const sell     = p.sellPrice  != null ? Number(p.sellPrice)  : null
    return {
      sku:       p.sku,
      name:      p.name,
      nameEs:    p.nameEs ?? '',
      category:  p.category.name,
      unit:      p.unit,
      stock,
      costPrice: cost,
      sellPrice: sell,
      costValue: cost != null ? (stock * cost).toFixed(2) : '',
      sellValue: sell != null ? (stock * sell).toFixed(2) : '',
    }
  })

  const header = ['SKU', 'Name', 'Name (ES)', 'Category', 'Unit', 'Current Stock', 'Cost/Unit', 'Sell/Unit', 'Cost Value', 'Sell Value']
  const lines  = [
    header.join(','),
    ...rows.map((r) => [
      r.sku,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.nameEs.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      r.unit,
      r.stock,
      r.costPrice ?? '',
      r.sellPrice ?? '',
      r.costValue,
      r.sellValue,
    ].join(',')),
  ]

  const date = new Date().toISOString().slice(0, 10)
  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="inventory-snapshot-${date}.csv"`,
    },
  })
}
