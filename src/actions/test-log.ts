'use server'

/**
 * Test Log Server Actions — src/actions/test-log.ts
 *
 * WHAT THIS FILE DOES
 * ────────────────────
 * Provides two Server Actions for the Test Log feature (Phase 7):
 *
 *   insertTestResults  — bulk-inserts one test run's results into test_results
 *   getTestRuns        — returns a summary of all test runs (aggregated by run_id)
 *
 * SECURITY MODEL
 * ──────────────
 * - Auth is checked at the top of every action. Unauthenticated callers get a
 *   { success: false } response — never an exception that leaks stack traces.
 * - Owner and Manager can insert and read. Staff cannot access this feature at all.
 * - `performed_by` is ALWAYS injected from the server-side session.
 *   It is NEVER accepted from the client payload (that would allow impersonation).
 * - All input is validated with Zod before it reaches Prisma.
 *
 * WHO CALLS THESE ACTIONS
 * ─────────────────────────
 * - insertTestResults: called by the manual QA form on /dashboard/test-log
 *   and by the CLI import script (scripts/import-test-results.ts).
 * - getTestRuns: called by the /dashboard/test-log Server Component to render
 *   the run history table.
 *
 * APPEND-ONLY GUARANTEE
 * ──────────────────────
 * test_results rows are never updated or deleted. This file contains no
 * UPDATE or DELETE Prisma calls. If you need to correct a wrong entry, add
 * a new row with a note in error_message. The full audit trail is preserved.
 */

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'

// ── Zod schemas ─────────────────────────────────────────────────────────────

/**
 * Valid category values for a test result row.
 * Mirrors the CHECK constraint in the DB (added during Phase 7 migration).
 */
const categoryEnum = z.enum(['unit', 'integration', 'e2e', 'manual_qa'])

/**
 * Valid status values for a test result row.
 * Mirrors the CHECK constraint in the DB.
 */
const statusEnum = z.enum(['pass', 'fail', 'skip'])

/**
 * Shape of a single test result as accepted from callers.
 * `performedBy` is deliberately NOT in this schema — it is injected server-side.
 */
const TestResultInputSchema = z.object({
  /** UUID that groups all results from the same test run. */
  runId: z.string().uuid(),
  /** Human-readable test name, e.g. "createProduct - valid input". */
  testName: z.string().min(1).max(500),
  /** Test category — must be one of the four approved values. */
  category: categoryEnum,
  /** Test outcome. */
  status: statusEnum,
  /**
   * How long the test took in milliseconds (from Vitest JSON output).
   * Optional — manual_qa rows typically omit this.
   */
  durationMs: z.number().int().nonnegative().optional(),
  /**
   * Error detail for failed tests, or free-text notes for manual_qa rows.
   * Optional — leave undefined for passing tests.
   */
  errorMessage: z.string().max(2000).optional(),
})

/** Array wrapper for bulk insert. */
const InsertTestResultsInputSchema = z.object({
  /** All rows must share the same runId. Validated below after Zod. */
  results: z.array(TestResultInputSchema).min(1).max(5000),
})

// ── Types ────────────────────────────────────────────────────────────────────

/** Shape returned by getTestRuns for each aggregated run. */
export interface TestRunSummary {
  runId: string
  /** Earliest createdAt in the run — used as the run timestamp. */
  runDate: Date
  total: number
  passed: number
  failed: number
  skipped: number
  /** Breakdown by category so the UI can show per-category counts. */
  byCategory: {
    unit:        { total: number; passed: number; failed: number }
    integration: { total: number; passed: number; failed: number }
    e2e:         { total: number; passed: number; failed: number }
    manual_qa:   { total: number; passed: number; failed: number }
  }
}

/** Standard typed result shape used across all Server Actions in this project. */
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

// ── Server Actions ───────────────────────────────────────────────────────────

/**
 * insertTestResults
 * ──────────────────
 * Bulk-inserts a set of test results for a single test run.
 *
 * Called by:
 *   - The manual QA form on /dashboard/test-log (one row at a time)
 *   - The CLI import script (many rows from Vitest JSON output)
 *
 * All rows must share the same `runId`. The caller generates the runId once
 * (e.g., `crypto.randomUUID()`) and passes it in every row.
 *
 * @param rawInput - Validated against InsertTestResultsInputSchema
 */
export async function insertTestResults(
  rawInput: unknown,
): Promise<ActionResult<{ count: number }>> {
  // 1. Authenticate — must be Owner or Manager
  const user = await getAuthUser()
  if (!user) {
    return { success: false, error: 'Not authenticated.' }
  }
  if (!hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Access denied. Owner or Manager role required.' }
  }

  // 2. Validate input
  const parsed = InsertTestResultsInputSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: `Validation error: ${parsed.error.message}` }
  }

  const { results } = parsed.data

  // 3. Sanity check: all rows must share the same runId
  const uniqueRunIds = new Set(results.map((r) => r.runId))
  if (uniqueRunIds.size > 1) {
    return {
      success: false,
      error: 'All results in a single call must share the same runId.',
    }
  }

  // 4. Build insert payload — inject performed_by from server session
  const rows = results.map((r) => ({
    runId:        r.runId,
    testName:     r.testName,
    category:     r.category,
    status:       r.status,
    durationMs:   r.durationMs ?? null,
    errorMessage: r.errorMessage ?? null,
    performedBy:  user.id,   // NEVER from client — always from session
  }))

  // 5. Bulk insert (createMany skips duplicate checking — fine for append-only)
  await prisma.testResult.createMany({ data: rows })

  return { success: true, data: { count: rows.length } }
}

/**
 * getTestRuns
 * ────────────
 * Returns a summary of all test runs, aggregated by run_id, most recent first.
 *
 * Called by the /dashboard/test-log Server Component to render the run history
 * table. Access is restricted to Owner and Manager — same RLS policy as the DB.
 */
export async function getTestRuns(): Promise<ActionResult<TestRunSummary[]>> {
  // 1. Authenticate — must be Owner or Manager
  const user = await getAuthUser()
  if (!user) {
    return { success: false, error: 'Not authenticated.' }
  }
  if (!hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Access denied. Owner or Manager role required.' }
  }

  // 2. Fetch all rows, ordered by runId + createdAt so aggregation is stable
  const rows = await prisma.testResult.findMany({
    orderBy: [{ runId: 'asc' }, { createdAt: 'asc' }],
  })

  // 3. Aggregate in memory by runId
  //    (GROUP BY in Prisma requires raw queries; in-memory is fine at this scale —
  //     test_results will have at most a few thousand rows for a small project.)
  const runMap = new Map<string, TestRunSummary>()

  for (const row of rows) {
    let summary = runMap.get(row.runId)

    if (!summary) {
      summary = {
        runId:    row.runId,
        runDate:  row.createdAt,
        total:    0,
        passed:   0,
        failed:   0,
        skipped:  0,
        byCategory: {
          unit:        { total: 0, passed: 0, failed: 0 },
          integration: { total: 0, passed: 0, failed: 0 },
          e2e:         { total: 0, passed: 0, failed: 0 },
          manual_qa:   { total: 0, passed: 0, failed: 0 },
        },
      }
      runMap.set(row.runId, summary)
    }

    // Overall counters
    summary.total++
    if (row.status === 'pass')  summary.passed++
    if (row.status === 'fail')  summary.failed++
    if (row.status === 'skip')  summary.skipped++

    // Per-category counters — category is validated on insert so casting is safe
    const cat = row.category as keyof typeof summary.byCategory
    if (cat in summary.byCategory) {
      summary.byCategory[cat].total++
      if (row.status === 'pass') summary.byCategory[cat].passed++
      if (row.status === 'fail') summary.byCategory[cat].failed++
    }
  }

  // 4. Sort by runDate descending (most recent run first)
  const summaries = Array.from(runMap.values()).sort(
    (a, b) => b.runDate.getTime() - a.runDate.getTime(),
  )

  return { success: true, data: summaries }
}

// ── getLastTestRun ────────────────────────────────────────────────────────────

export interface LastRunInfo {
  runDate:   Date
  passed:    number
  total:     number
  hasFailed: boolean
}

/**
 * Lightweight query for the dashboard widget.
 * Returns a summary of the most recent test run only.
 */
export async function getLastTestRun(): Promise<ActionResult<LastRunInfo | null>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const latest = await prisma.testResult.findFirst({
      orderBy: { createdAt: 'desc' },
      select:  { runId: true },
    })
    if (!latest) return { success: true, data: null }

    const rows = await prisma.testResult.findMany({
      where:  { runId: latest.runId },
      select: { status: true, createdAt: true },
    })

    const runDate   = rows.reduce((min, r) => (r.createdAt < min ? r.createdAt : min), rows[0].createdAt)
    const passed    = rows.filter((r) => r.status === 'pass').length
    const hasFailed = rows.some((r) => r.status === 'fail')

    return { success: true, data: { runDate, passed, total: rows.length, hasFailed } }
  } catch {
    return { success: false, error: 'Could not load last test run.' }
  }
}
