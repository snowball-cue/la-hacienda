import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getPayrollDetail } from '@/actions/payroll'
import ExcelJS from 'exceljs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { id } = await params
  const format = request.nextUrl.searchParams.get('format') ?? 'csv'

  const result = await getPayrollDetail(id)
  if (!result.success) return new NextResponse('Not found', { status: 404 })

  const { period, rows } = result.data

  const periodLabel = `${period.periodStart}_${period.periodEnd}`

  if (format === 'xlsx') {
    const workbook  = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Payroll')

    worksheet.columns = [
      { header: 'Employee Name',        key: 'name',       width: 22 },
      { header: 'Pay Period Start',     key: 'start',      width: 16 },
      { header: 'Pay Period End',       key: 'end',        width: 16 },
      { header: 'Scheduled Hours',      key: 'sched',      width: 16 },
      { header: 'Actual Hours',         key: 'actual',     width: 14 },
      { header: 'Effective Hours',      key: 'effective',  width: 16 },
      { header: 'Regular Hours',        key: 'regular',    width: 14 },
      { header: 'Overtime Hours',       key: 'overtime',   width: 14 },
      { header: 'Hourly Rate',          key: 'rate',       width: 12 },
      { header: 'Regular Pay',          key: 'regPay',     width: 12 },
      { header: 'Overtime Pay (1.5x)',  key: 'otPay',      width: 18 },
      { header: 'Gross Pay',            key: 'gross',      width: 12 },
      { header: 'Notes',                key: 'note',       width: 30 },
    ]

    // Style header row
    const headerRow = worksheet.getRow(1)
    headerRow.font      = { bold: true }
    headerRow.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8E0D8' } }
    headerRow.alignment = { horizontal: 'center' }
    headerRow.commit()

    for (const row of rows) {
      const rate    = row.hourlyRate ? Number(row.hourlyRate) : null
      const regPay  = rate != null ? row.regularHours  * rate       : null
      const otPay   = rate != null ? row.overtimeHours * rate * 1.5 : null
      const gross   = row.grossPay ? Number(row.grossPay) : null

      worksheet.addRow({
        name:      row.profileName,
        start:     period.periodStart,
        end:       period.periodEnd,
        sched:     row.scheduledHours,
        actual:    row.actualHours ?? '',
        effective: row.effectiveHours,
        regular:   row.regularHours,
        overtime:  row.overtimeHours,
        rate:      rate ?? '',
        regPay:    regPay != null ? Math.round(regPay * 100) / 100 : '',
        otPay:     otPay  != null ? Math.round(otPay  * 100) / 100 : '',
        gross:     gross ?? '',
        note:      row.note ?? '',
      })
    }

    // Number formats for money columns
    for (let r = 2; r <= rows.length + 1; r++) {
      ['rate', 'regPay', 'otPay', 'gross'].forEach(key => {
        const cell = worksheet.getRow(r).getCell(
          (worksheet.columns.findIndex(c => c.key === key) + 1)
        )
        cell.numFmt = '"$"#,##0.00'
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="payroll-${periodLabel}.xlsx"`,
      },
    })
  }

  // CSV format (default)
  const headers = [
    'Employee Name',
    'Pay Period Start',
    'Pay Period End',
    'Scheduled Hours',
    'Actual Hours',
    'Effective Hours',
    'Regular Hours',
    'Overtime Hours',
    'Hourly Rate',
    'Regular Pay',
    'Overtime Pay (1.5x)',
    'Gross Pay',
    'Notes',
  ]

  const csvRows = rows.map(row => {
    const rate   = row.hourlyRate ? Number(row.hourlyRate) : null
    const regPay = rate != null ? Math.round(row.regularHours  * rate       * 100) / 100 : ''
    const otPay  = rate != null ? Math.round(row.overtimeHours * rate * 1.5 * 100) / 100 : ''

    return [
      row.profileName,
      period.periodStart,
      period.periodEnd,
      row.scheduledHours.toFixed(2),
      row.actualHours?.toFixed(2)   ?? '',
      row.effectiveHours.toFixed(2),
      row.regularHours.toFixed(2),
      row.overtimeHours.toFixed(2),
      rate?.toFixed(2) ?? '',
      regPay !== '' ? String(regPay) : '',
      otPay  !== '' ? String(otPay)  : '',
      row.grossPay ?? '',
      row.note     ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  })

  const csv = [headers.join(','), ...csvRows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="payroll-${periodLabel}.csv"`,
    },
  })
}
