/**
 * Test Log Download — src/app/api/test-log/download/route.ts
 *
 * WHAT THIS FILE DOES
 * ────────────────────
 * A GET Route Handler that:
 *   1. Validates the caller is an authenticated Owner or Manager.
 *   2. Queries test_results from the database (optionally filtered by runId).
 *   3. Builds a multi-sheet Excel workbook using ExcelJS.
 *   4. Returns the binary .xlsx as a file download response.
 *
 * WHY A ROUTE HANDLER (NOT A SERVER ACTION)
 * ──────────────────────────────────────────
 * Next.js 15 Server Actions return JSON, not binary streams. For file downloads
 * the correct pattern is a Route Handler that returns a Response with binary
 * content and the appropriate Content-Disposition header.
 *
 * The dashboard button is a plain <a href="/api/test-log/download"> — no JS
 * framework required. The browser receives the file and saves it directly.
 *
 * SECURITY
 * ─────────
 * - Auth is checked via getAuthUser() (network-validated session, not just cookie).
 * - Staff and unauthenticated callers receive a 403 — no workbook is generated.
 * - The query uses the server Supabase client which respects RLS policies as a
 *   secondary defence layer.
 *
 * QUERY PARAMETERS
 * ─────────────────
 * ?runId=<uuid>   Optional. If provided, the download is scoped to that run.
 *                 If omitted, all test runs are included (full export).
 *
 * EXCEL WORKBOOK STRUCTURE
 * ─────────────────────────
 * Sheet 1 — Summary        Run ID, date, total/pass/fail/skip by category
 * Sheet 2 — Unit Tests     All rows where category = 'unit'
 * Sheet 3 — Integration    All rows where category = 'integration'
 * Sheet 4 — E2E            All rows where category = 'e2e'
 * Sheet 5 — Manual QA      All rows where category = 'manual_qa'
 *
 * ExcelJS is imported here ONLY — it is never imported by any Client Component,
 * so it has zero impact on the browser bundle size.
 */

import ExcelJS from 'exceljs'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'

// ── Constants ────────────────────────────────────────────────────────────────

/** MIME type for .xlsx files (OOXML spreadsheet). */
const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Column header style: bold, light blue fill. */
const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD6E4F0' },
}

/** Status cell colors — green for pass, red for fail, grey for skip. */
const STATUS_COLOR: Record<string, string> = {
  pass: 'FF22C55E',  // Tailwind green-500
  fail: 'FFEF4444',  // Tailwind red-500
  skip: 'FF9CA3AF',  // Tailwind gray-400
}

// ── Route Handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<Response> {
  // ── 1. Auth check ──────────────────────────────────────────────────────────
  const user = await getAuthUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!hasMinimumRole(user.role, 'manager')) {
    return new Response('Forbidden — Owner or Manager role required.', { status: 403 })
  }

  // ── 2. Parse query params ─────────────────────────────────────────────────
  const { searchParams } = request.nextUrl
  const runIdParam = searchParams.get('runId')

  // Validate runId if provided — must be a UUID
  if (runIdParam !== null && !/^[0-9a-f-]{36}$/i.test(runIdParam)) {
    return new Response('Invalid runId parameter.', { status: 400 })
  }

  // ── 3. Query test_results ──────────────────────────────────────────────────
  const rows = await prisma.testResult.findMany({
    where: runIdParam ? { runId: runIdParam } : undefined,
    orderBy: [{ runId: 'asc' }, { category: 'asc' }, { testName: 'asc' }],
  })

  if (rows.length === 0) {
    return new Response('No test results found.', { status: 404 })
  }

  // ── 4. Build ExcelJS workbook ──────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'La Hacienda — Test Log'
  workbook.created = new Date()

  // Helper: add a styled header row to a sheet
  function addHeaderRow(sheet: ExcelJS.Worksheet, headers: string[]): void {
    const row = sheet.addRow(headers)
    row.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = HEADER_FILL
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF93C5FD' } },
      }
    })
    row.commit()
  }

  // Helper: color a status cell
  function colorStatus(cell: ExcelJS.Cell, status: string): void {
    const argb = STATUS_COLOR[status]
    if (argb) {
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }
    }
  }

  // ── Sheet 1: Summary ───────────────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet('Summary')
  summarySheet.columns = [
    { header: '', key: 'label',      width: 26 },
    { header: '', key: 'unit',       width: 14 },
    { header: '', key: 'integration',width: 16 },
    { header: '', key: 'e2e',        width: 10 },
    { header: '', key: 'manual_qa',  width: 14 },
    { header: '', key: 'total',      width: 10 },
  ]

  // Title
  summarySheet.mergeCells('A1:F1')
  const titleCell = summarySheet.getCell('A1')
  titleCell.value = 'La Hacienda — Test Log Summary'
  titleCell.font = { bold: true, size: 14 }
  titleCell.alignment = { horizontal: 'center' }

  summarySheet.addRow([])  // blank row

  // Sub-header
  addHeaderRow(summarySheet, ['Run / Metric', 'Unit', 'Integration', 'E2E', 'Manual QA', 'Total'])

  // Aggregate per-run, per-category stats
  type CategoryKey = 'unit' | 'integration' | 'e2e' | 'manual_qa'
  const categories: CategoryKey[] = ['unit', 'integration', 'e2e', 'manual_qa']

  interface RunBucket {
    runId: string
    runDate: Date
    counts: Record<CategoryKey, { pass: number; fail: number; skip: number }>
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
    // Run ID header row
    const runRow = summarySheet.addRow([
      `Run: ${bucket.runDate.toISOString().slice(0, 19).replace('T', ' ')} UTC`,
      '', '', '', '', '',
    ])
    runRow.getCell(1).font = { bold: true, italic: true }

    // Pass / Fail / Skip rows for this run
    for (const metric of ['pass', 'fail', 'skip'] as const) {
      const rowData = [
        `  ${metric.charAt(0).toUpperCase() + metric.slice(1)}`,
        ...categories.map((cat) => bucket.counts[cat][metric]),
        categories.reduce((sum, cat) => sum + bucket.counts[cat][metric], 0),
      ]
      const dataRow = summarySheet.addRow(rowData)

      // Color the label cell by status
      colorStatus(dataRow.getCell(1), metric)
    }

    summarySheet.addRow([])  // blank row between runs
  }

  // ── Sheets 2–5: Per-category detail ──────────────────────────────────────
  const detailHeaders = [
    'Test Name',
    'Status',
    'Duration (ms)',
    'Error / Notes',
    'Run Date (UTC)',
    'Run ID',
  ]

  const sheetDefs: { name: string; category: CategoryKey }[] = [
    { name: 'Unit Tests',    category: 'unit'        },
    { name: 'Integration',   category: 'integration' },
    { name: 'E2E',           category: 'e2e'         },
    { name: 'Manual QA',     category: 'manual_qa'   },
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

    addHeaderRow(sheet, detailHeaders)

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

      // Color the Status cell
      colorStatus(dataRow.getCell(2), r.status)
    }
  }

  // ── 5. Serialize to buffer ─────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer()

  // ── 6. Determine filename ──────────────────────────────────────────────────
  const dateStamp = new Date().toISOString().slice(0, 10)  // e.g., 2026-04-05
  const suffix = runIdParam ? `-${runIdParam.slice(0, 8)}` : '-all-runs'
  const filename = `test-log-${dateStamp}${suffix}.xlsx`

  // ── 7. Return binary response ─────────────────────────────────────────────
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="${filename}"`,
      // Prevent caching — the log content changes as tests are added
      'Cache-Control': 'no-store',
    },
  })
}
