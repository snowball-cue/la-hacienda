/**
 * Test Log Page — src/app/(dashboard)/test-log/page.tsx
 *
 * WHAT THIS PAGE DOES
 * ────────────────────
 * Displays a history of all test runs, aggregated by run_id, with per-run
 * pass/fail/skip counts. Owner and Manager users can download the full
 * test log as an Excel .xlsx file.
 *
 * ACCESS
 * ──────
 * Owner and Manager only — Staff will never see the link to this page.
 * Server-side role check is enforced here (not only via middleware) so that
 * direct URL access by a Staff member returns a 403-style message.
 *
 * SERVER COMPONENT
 * ─────────────────
 * This is a Server Component — it fetches run data at render time, no
 * client-side JavaScript or useEffect needed. The download is a plain
 * <a> link to /api/test-log/download so it also works without JavaScript.
 *
 * QUALITY GATE
 * ─────────────
 * This page is the official sign-off screen before Phase 8 (Production
 * Deployment). The Owner or Manager reviews the final run here, confirms
 * 100% pass on all automated categories, and downloads the .xlsx log.
 * The download itself is logged server-side with performed_by.
 */

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getTestRuns } from '@/actions/test-log'
import type { TestRunSummary } from '@/actions/test-log'

export const metadata: Metadata = {
  title: 'Test Log',
  description: 'QA test run history and quality gate sign-off.',
  robots: 'noindex',
}

// ── Sub-components ───────────────────────────────────────────────────────────

/**
 * Badge that shows pass, fail, or skip counts with colour coding.
 */
function StatusBadge({
  count,
  type,
}: {
  count: number
  type: 'pass' | 'fail' | 'skip'
}) {
  const colours = {
    pass: 'bg-green-100 text-green-800',
    fail: 'bg-red-100 text-red-800',
    skip: 'bg-stone-100 text-stone-600',
  }
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${colours[type]}`}>
      {count} {type}
    </span>
  )
}

/**
 * A single row in the run history table.
 */
function RunRow({ run }: { run: TestRunSummary }) {
  const allPassed = run.failed === 0 && run.total > 0
  const hasFailures = run.failed > 0

  return (
    <tr className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
      {/* Run date */}
      <td className="py-3 px-4 text-sm text-stone-600 font-mono whitespace-nowrap">
        {run.runDate.toISOString().slice(0, 19).replace('T', ' ')} UTC
      </td>

      {/* Overall status indicator */}
      <td className="py-3 px-4">
        {allPassed ? (
          <span className="inline-flex items-center gap-1 text-green-700 text-sm font-medium">
            ✓ All passed
          </span>
        ) : hasFailures ? (
          <span className="inline-flex items-center gap-1 text-red-700 text-sm font-medium">
            ✗ {run.failed} failed
          </span>
        ) : (
          <span className="text-stone-400 text-sm">—</span>
        )}
      </td>

      {/* Counts */}
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1">
          <StatusBadge count={run.passed}  type="pass" />
          {run.failed  > 0 && <StatusBadge count={run.failed}  type="fail" />}
          {run.skipped > 0 && <StatusBadge count={run.skipped} type="skip" />}
        </div>
      </td>

      {/* Category breakdown */}
      <td className="py-3 px-4 text-xs text-stone-500 space-y-0.5">
        {(['unit', 'integration', 'e2e', 'manual_qa'] as const).map((cat) => {
          const c = run.byCategory[cat]
          if (c.total === 0) return null
          return (
            <div key={cat}>
              <span className="font-medium">{cat}:</span>{' '}
              {c.passed}/{c.total}
              {c.failed > 0 && (
                <span className="text-red-600"> ({c.failed} failed)</span>
              )}
            </div>
          )
        })}
      </td>

      {/* Download link scoped to this run */}
      <td className="py-3 px-4">
        <a
          href={`/api/test-log/download?runId=${run.runId}`}
          className="text-sm text-terracotta hover:underline"
        >
          Download .xlsx
        </a>
      </td>
    </tr>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function TestLogPage() {
  // 1. Auth + role check
  const user = await getAuthUser()
  if (!user) {
    redirect('/login?redirectTo=/dashboard/test-log')
  }
  if (!hasMinimumRole(user.role, 'manager')) {
    // Staff who navigate directly to this URL see an access-denied message
    return (
      <main className="p-8">
        <p className="text-stone-500">
          Access denied. Owner or Manager role required.
        </p>
      </main>
    )
  }

  // 2. Fetch run history
  const result = await getTestRuns()

  return (
    <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Test Log</h1>
          <p className="mt-1 text-sm text-stone-500">
            QA test run history. Download the full log as Excel for the Phase 8
            quality gate sign-off.
          </p>
        </div>

        {/* Download all runs */}
        <a
          href="/api/test-log/download"
          className="btn-primary whitespace-nowrap"
        >
          Download All Runs (.xlsx)
        </a>
      </div>

      {/* ── Quality gate notice ─────────────────────────────────────────── */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium">Phase 8 Quality Gate</p>
        <p className="mt-1 text-amber-700">
          Before deploying to production, confirm the most recent run shows 100%
          pass on all automated categories and manual QA is complete. Then
          download the log below — the download is recorded as your sign-off.
        </p>
      </div>

      {/* ── Run history table ────────────────────────────────────────────── */}
      {!result.success ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load test runs: {result.error}
        </div>
      ) : result.data.length === 0 ? (
        <div className="card p-8 text-center text-stone-400">
          <p className="text-lg font-medium">No test runs yet.</p>
          <p className="mt-1 text-sm">
            Run the test suite and use{' '}
            <code className="bg-stone-100 px-1 rounded">
              npx tsx scripts/import-test-results.ts
            </code>{' '}
            to import results, or add manual QA rows from the form below.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50">
                <th className="py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Run Date
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Overall
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Counts
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  By Category
                </th>
                <th className="py-3 px-4 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Export
                </th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((run) => (
                <RunRow key={run.runId} run={run} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Manual QA entry notice ───────────────────────────────────────── */}
      <div className="card p-4 text-sm text-stone-500">
        <p className="font-medium text-stone-700">Adding manual QA results</p>
        <p className="mt-1">
          Use the <code className="bg-stone-100 px-1 rounded">insertTestResults</code>{' '}
          Server Action with <code className="bg-stone-100 px-1 rounded">category: "manual_qa"</code>{' '}
          to log cross-device checks and bilingual label verifications.
          A dedicated form UI will be added in a future iteration.
        </p>
      </div>

    </main>
  )
}
