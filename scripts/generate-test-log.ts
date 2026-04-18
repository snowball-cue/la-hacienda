/**
 * Generate Test Log to Disk — scripts/generate-test-log.ts
 *
 * Generates the Excel test log and saves it directly to G:\Strix7\.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/generate-test-log.ts
 *
 * Optional — scope to one run:
 *   npx tsx --env-file=.env.local scripts/generate-test-log.ts <run-id-uuid>
 *
 * Output:
 *   G:\Strix7\test-log-YYYY-MM-DD.xlsx
 */

import ExcelJS from 'exceljs'
import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'
import path from 'path'

const XLSX_OUTPUT_DIR = path.resolve('G:/Strix7')

const STATUS_COLOR: Record<string, string> = {
  pass: 'FF22C55E',
  fail: 'FFEF4444',
  skip: 'FF9CA3AF',
}

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD6E4F0' },
}

function addHeaderRow(sheet: ExcelJS.Worksheet, headers: string[]): void {
  const row = sheet.addRow(headers)
  row.eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = HEADER_FILL
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF93C5FD' } } }
  })
  row.commit()
}

function colorStatus(cell: ExcelJS.Cell, status: string): void {
  const argb = STATUS_COLOR[status]
  if (argb) {
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
  }
}

async function main(): Promise<void> {
  const runIdFilter = process.argv[2] ?? null

  if (runIdFilter && !/^[0-9a-f-]{36}$/i.test(runIdFilter)) {
    console.error('Invalid run ID. Must be a UUID (e.g. 550e8400-e29b-41d4-a716-446655440000).')
    process.exit(1)
  }

  const prisma = new PrismaClient()

  try {
    const rows = await prisma.testResult.findMany({
      where: runIdFilter ? { runId: runIdFilter } : undefined,
      orderBy: [{ runId: 'asc' }, { category: 'asc' }, { testName: 'asc' }],
    })

    if (rows.length === 0) {
      console.log('No test results in the database. Import some first.')
      return
    }

    console.log(`Found ${rows.length} test result(s). Building workbook...`)

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'La Hacienda — Test Log'
    workbook.created = new Date()

    // ── Sheet 1: Summary ────────────────────────────────────────────────────
    const summarySheet = workbook.addWorksheet('Summary')
    summarySheet.columns = [
      { key: 'label',      width: 26 },
      { key: 'unit',       width: 14 },
      { key: 'integration',width: 16 },
      { key: 'e2e',        width: 10 },
      { key: 'manual_qa',  width: 14 },
      { key: 'total',      width: 10 },
    ]

    summarySheet.mergeCells('A1:F1')
    const titleCell = summarySheet.getCell('A1')
    titleCell.value = 'La Hacienda — Test Log Summary'
    titleCell.font = { bold: true, size: 14 }
    titleCell.alignment = { horizontal: 'center' }
    summarySheet.addRow([])

    addHeaderRow(summarySheet, ['Run / Metric', 'Unit', 'Integration', 'E2E', 'Manual QA', 'Total'])

    type CategoryKey = 'unit' | 'integration' | 'e2e' | 'manual_qa'
    const categories: CategoryKey[] = ['unit', 'integration', 'e2e', 'manual_qa']

    interface RunBucket {
      runId:   string
      runDate: Date
      counts:  Record<CategoryKey, { pass: number; fail: number; skip: number }>
    }

    const runBuckets = new Map<string, RunBucket>()

    for (const row of rows) {
      let bucket = runBuckets.get(row.runId)
      if (!bucket) {
        bucket = {
          runId: row.runId,
          runDate: row.createdAt,
          counts: {
            unit:        { pass: 0, fail: 0, skip: 0 },
            integration: { pass: 0, fail: 0, skip: 0 },
            e2e:         { pass: 0, fail: 0, skip: 0 },
            manual_qa:   { pass: 0, fail: 0, skip: 0 },
          },
        }
        runBuckets.set(row.runId, bucket)
      }
      const cat = row.category as CategoryKey
      if (cat in bucket.counts) {
        const s = row.status as 'pass' | 'fail' | 'skip'
        if (s in bucket.counts[cat]) bucket.counts[cat][s]++
      }
    }

    for (const bucket of runBuckets.values()) {
      const runRow = summarySheet.addRow([
        `Run: ${bucket.runDate.toISOString().slice(0, 19).replace('T', ' ')} UTC`,
        '', '', '', '', '',
      ])
      runRow.getCell(1).font = { bold: true, italic: true }

      for (const metric of ['pass', 'fail', 'skip'] as const) {
        const rowData = [
          `  ${metric.charAt(0).toUpperCase() + metric.slice(1)}`,
          ...categories.map((cat) => bucket.counts[cat][metric]),
          categories.reduce((sum, cat) => sum + bucket.counts[cat][metric], 0),
        ]
        const dataRow = summarySheet.addRow(rowData)
        colorStatus(dataRow.getCell(1), metric)
      }
      summarySheet.addRow([])
    }

    // ── Sheets 2–5: Per-category detail ────────────────────────────────────
    const sheetDefs: { name: string; category: CategoryKey }[] = [
      { name: 'Unit Tests',  category: 'unit'        },
      { name: 'Integration', category: 'integration' },
      { name: 'E2E',         category: 'e2e'         },
      { name: 'Manual QA',   category: 'manual_qa'   },
    ]

    for (const { name, category } of sheetDefs) {
      const sheet = workbook.addWorksheet(name)
      sheet.columns = [
        { key: 'testName',     width: 50 },
        { key: 'status',       width: 12 },
        { key: 'durationMs',   width: 14 },
        { key: 'errorMessage', width: 50 },
        { key: 'runDate',      width: 22 },
        { key: 'runId',        width: 38 },
      ]

      addHeaderRow(sheet, ['Test Name', 'Status', 'Duration (ms)', 'Error / Notes', 'Run Date (UTC)', 'Run ID'])

      const categoryRows = rows.filter((r) => r.category === category)

      if (categoryRows.length === 0) {
        sheet.addRow(['(no results for this category)', '', '', '', '', ''])
        continue
      }

      for (const r of categoryRows) {
        const dataRow = sheet.addRow([
          r.testName,
          r.status,
          r.durationMs ?? '',
          r.errorMessage ?? '',
          r.createdAt.toISOString().slice(0, 19).replace('T', ' '),
          r.runId,
        ])
        colorStatus(dataRow.getCell(2), r.status)
      }
    }

    // ── Save to disk ────────────────────────────────────────────────────────
    const dateStamp = new Date().toISOString().slice(0, 10)
    const suffix    = runIdFilter ? `-${runIdFilter.slice(0, 8)}` : '-all-runs'
    const filename  = `test-log-${dateStamp}${suffix}.xlsx`
    const outputPath = path.join(XLSX_OUTPUT_DIR, filename)

    const buffer = await workbook.xlsx.writeBuffer()
    writeFileSync(outputPath, Buffer.from(buffer))

    console.log(`✓ Saved: ${outputPath}`)
    console.log(`  Rows: ${rows.length}  |  Runs: ${runBuckets.size}`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
