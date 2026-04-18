import { type NextRequest, NextResponse } from 'next/server'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const REASON_LABEL: Record<string, string> = {
  received:         'Received',
  sold:             'Sold',
  adjustment:       'Adjustment',
  spoilage:         'Spoilage',
  theft:            'Theft / Shrinkage',
  return:           'Customer Return',
  count_correction: 'Count Correction',
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const p         = req.nextUrl.searchParams
  const productId = p.get('product')  ?? undefined
  const reason    = p.get('reason')   ?? undefined
  const dateFrom  = p.get('dateFrom') ? new Date(p.get('dateFrom')! + 'T00:00:00Z') : undefined
  const dateTo    = p.get('dateTo')   ? new Date(p.get('dateTo')!   + 'T23:59:59Z') : undefined

  const entries = await prisma.stockLedger.findMany({
    where: {
      ...(productId && { productId }),
      ...(reason    && { reason }),
      ...((dateFrom || dateTo) ? {
        createdAt: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo   && { lte: dateTo   }),
        },
      } : {}),
    },
    include: { product: { select: { name: true, sku: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Resolve performer names
  const uniqueIds = [...new Set(entries.map((e) => e.performedBy))]
  const profiles  = await prisma.profile.findMany({
    where:  { id: { in: uniqueIds } },
    select: { id: true, firstName: true, lastName: true, middleName: true },
  })
  const nameMap = new Map(profiles.map((pr) => [pr.id, formatEmployeeName(pr.lastName, pr.firstName, pr.middleName)]))

  const header = ['Date', 'Time', 'SKU', 'Product', 'Change Qty', 'Reason', 'Note', 'Performed By']
  const lines  = [
    header.join(','),
    ...entries.map((e) => {
      const d = e.createdAt
      return [
        d.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }),
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        e.product.sku,
        `"${e.product.name.replace(/"/g, '""')}"`,
        Number(e.changeQty),
        REASON_LABEL[e.reason] ?? e.reason,
        `"${(e.note ?? '').replace(/"/g, '""')}"`,
        `"${nameMap.get(e.performedBy) ?? e.performedBy}"`,
      ].join(',')
    }),
  ]

  const date = new Date().toISOString().slice(0, 10)
  return new Response(lines.join('\r\n'), {
    headers: {
      'Content-Type':        'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="stock-movements-${date}.csv"`,
    },
  })
}
