/**
 * Vitest JSON → Supabase Importer — scripts/import-test-results.ts
 *
 * WHAT THIS SCRIPT DOES
 * ──────────────────────
 * Reads a Vitest JSON reporter output file, maps each test result to a
 * test_results row, and bulk-inserts it into Supabase via the insertTestResults
 * Server Action logic (direct Supabase client call — no HTTP needed).
 *
 * HOW TO USE
 * ──────────
 *   # Step 1: Run tests with JSON output
 *   npm test -- --reporter=json --outputFile=test-output.json
 *
 *   # Step 2: Import results into Supabase
 *   npx tsx scripts/import-test-results.ts test-output.json
 *
 * REQUIREMENTS
 * ─────────────
 * - .env.local must be present with valid NEXT_PUBLIC_SUPABASE_URL,
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY, and a SUPABASE_IMPORT_EMAIL +
 *   SUPABASE_IMPORT_PASSWORD for the authenticating developer account.
 * - The authenticated user must have Owner or Manager role in the profiles table.
 * - tsx must be available: npm install --save-dev tsx (already in devDeps if added)
 *
 * AUTHENTICATION
 * ──────────────
 * The script signs in with email+password to get a valid session, then uses
 * that session to insert rows. This mirrors the server-side auth check in the
 * insertTestResults Server Action — performed_by is set to the authenticated
 * user's ID.
 *
 * Why not call the Server Action directly? Server Actions run in the Next.js
 * request lifecycle. This script runs in a standalone Node.js process, so it
 * calls the Supabase client and Prisma directly, replicating the same logic.
 *
 * CATEGORY MAPPING
 * ─────────────────
 * Vitest organizes tests by file. This script maps test file paths to categories:
 *   foo.unit.test.ts        → 'unit'
 *   foo.integration.test.ts → 'integration'
 *   foo.e2e.test.ts         → 'e2e'
 *   (anything else)         → 'unit'  (safe default — tester can override manually)
 *
 * VITEST JSON FORMAT (relevant fields)
 * ──────────────────────────────────────
 *   {
 *     "testResults": [
 *       {
 *         "testFilePath": "/path/to/file.test.ts",
 *         "testResults": [
 *           {
 *             "fullName":    "test suite > test name",
 *             "status":      "passed" | "failed" | "pending" | "todo",
 *             "duration":    123,          // ms
 *             "failureMessages": ["..."]   // populated on failure
 *           }
 *         ]
 *       }
 *     ]
 *   }
 */

import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import path from 'path'

// ── Env ───────────────────────────────────────────────────────────────────────

function requireEnv(key: string): string {
  const val = process.env[key]
  if (!val) {
    console.error(`Missing required environment variable: ${key}`)
    process.exit(1)
  }
  return val
}

// Load .env.local manually (tsx doesn't auto-load it)
// If you use dotenv: import 'dotenv/config' — but we avoid extra deps here.
// Run with: NODE_ENV=development tsx --env-file=.env.local scripts/import-test-results.ts
const SUPABASE_URL      = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_ANON_KEY = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const IMPORT_EMAIL      = requireEnv('SUPABASE_IMPORT_EMAIL')
const IMPORT_PASSWORD   = requireEnv('SUPABASE_IMPORT_PASSWORD')

// ── Vitest JSON types (subset of actual output) ───────────────────────────────

interface VitestTestResult {
  fullName: string
  status: 'passed' | 'failed' | 'pending' | 'todo'
  duration: number | null
  failureMessages: string[]
}

interface VitestSuite {
  testFilePath: string
  testResults: VitestTestResult[]
}

interface VitestOutput {
  testResults: VitestSuite[]
}

// ── Category inference ────────────────────────────────────────────────────────

type Category = 'unit' | 'integration' | 'e2e' | 'manual_qa'

/**
 * Infer the test_results category from the test file path.
 *
 * Naming convention:
 *   *.integration.test.ts → 'integration'
 *   *.e2e.test.ts         → 'e2e'
 *   *.unit.test.ts        → 'unit'
 *   anything else         → 'unit' (safe default)
 */
function inferCategory(filePath: string): Category {
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized.includes('.integration.test.')) return 'integration'
  if (normalized.includes('.e2e.test.'))         return 'e2e'
  return 'unit'
}

/**
 * Map Vitest status to test_results status.
 * 'pending' and 'todo' are treated as 'skip' — they exist in the suite but
 * did not produce a pass/fail outcome.
 */
function mapStatus(vitestStatus: VitestTestResult['status']): 'pass' | 'fail' | 'skip' {
  switch (vitestStatus) {
    case 'passed':  return 'pass'
    case 'failed':  return 'fail'
    default:        return 'skip'
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // 1. Parse CLI argument
  const inputFile = process.argv[2]
  if (!inputFile) {
    console.error('Usage: npx tsx scripts/import-test-results.ts <path-to-vitest-output.json>')
    process.exit(1)
  }

  const absolutePath = path.resolve(inputFile)
  console.log(`Reading: ${absolutePath}`)

  // 2. Parse Vitest JSON output
  let vitestOutput: VitestOutput
  try {
    vitestOutput = JSON.parse(readFileSync(absolutePath, 'utf-8')) as VitestOutput
  } catch (err) {
    console.error('Failed to parse Vitest JSON output:', err)
    process.exit(1)
  }

  if (!vitestOutput.testResults || !Array.isArray(vitestOutput.testResults)) {
    console.error('Invalid Vitest JSON format — missing testResults array.')
    process.exit(1)
  }

  // 3. Authenticate with Supabase to get performed_by
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: IMPORT_EMAIL,
    password: IMPORT_PASSWORD,
  })

  if (authError || !authData.user) {
    console.error('Supabase auth failed:', authError?.message ?? 'No user returned')
    process.exit(1)
  }

  const performedBy = authData.user.id
  console.log(`Authenticated as: ${authData.user.email} (${performedBy})`)

  // 4. Generate a single runId for all results in this import
  const runId = randomUUID()
  console.log(`Run ID: ${runId}`)

  // 5. Map Vitest results to test_results rows
  const rows: {
    runId: string
    testName: string
    category: Category
    status: 'pass' | 'fail' | 'skip'
    durationMs: number | null
    errorMessage: string | null
    performedBy: string
  }[] = []

  for (const suite of vitestOutput.testResults) {
    const category = inferCategory(suite.testFilePath)

    for (const test of suite.testResults) {
      rows.push({
        runId,
        testName:     test.fullName.slice(0, 500),  // match DB max length safety
        category,
        status:       mapStatus(test.status),
        durationMs:   test.duration ?? null,
        errorMessage: test.failureMessages.join('\n').slice(0, 2000) || null,
        performedBy,
      })
    }
  }

  if (rows.length === 0) {
    console.log('No test results found in the JSON file. Nothing to insert.')
    process.exit(0)
  }

  console.log(`Inserting ${rows.length} test results...`)

  // 6. Bulk insert via Prisma (direct DB access — script runs server-side)
  const prisma = new PrismaClient()

  try {
    const result = await prisma.testResult.createMany({ data: rows })
    console.log(`✓ Inserted ${result.count} rows (run_id: ${runId})`)
  } catch (err) {
    console.error('Database insert failed:', err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
    await supabase.auth.signOut()
  }

  // 7. Print summary
  const passed  = rows.filter((r) => r.status === 'pass').length
  const failed  = rows.filter((r) => r.status === 'fail').length
  const skipped = rows.filter((r) => r.status === 'skip').length

  console.log('')
  console.log('── Run Summary ──────────────────────────────────────')
  console.log(`  Total:   ${rows.length}`)
  console.log(`  Passed:  ${passed}`)
  console.log(`  Failed:  ${failed}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Run ID:  ${runId}`)
  console.log('')

  if (failed > 0) {
    console.log(`⚠ ${failed} test(s) failed. Review /dashboard/test-log before Phase 8.`)
    process.exit(1)  // Non-zero exit signals CI that the gate is not met
  } else {
    console.log('✓ All tests passed. Quality gate may proceed if manual QA is also complete.')
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
