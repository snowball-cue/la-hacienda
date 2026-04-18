import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser, hasMinimumRole } from '@/lib/auth'
import { getTasks } from '@/actions/tasks'
import TaskBoard from './TaskBoard'

export const metadata: Metadata = { title: 'Tasks' }

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ priority?: string; assignee?: string }>
}) {
  // ── Auth + role guard ───────────────────────────────────────────────
  const user = await getAuthUser()
  if (!user) redirect('/login')

  // Staff cannot access the task board (CLAUDE.md — Phase 4b RLS policy)
  if (!hasMinimumRole(user.role, 'manager')) {
    redirect('/dashboard')
  }

  // ── Fetch tasks ─────────────────────────────────────────────────────
  const params = await searchParams
  const result = await getTasks({
    priority: params.priority as 'high' | 'medium' | 'low' | undefined,
    assignee: params.assignee,
  })

  const tasks = result.success ? result.data : []
  const dbError = !result.success ? result.error : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-screen-xl">

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="page-title">Task Board</h1>
        <p className="text-sm text-stone-500 mt-1">
          Internal project &amp; operations tasks · Owner and Manager only
        </p>
      </div>

      {/* ── DB not connected yet ──────────────────────────────────────── */}
      {dbError && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold mb-1">Database not connected</p>
          <p>
            Configure <code className="bg-amber-100 px-1 rounded font-mono text-xs">.env.local</code> and run{' '}
            <code className="bg-amber-100 px-1 rounded font-mono text-xs">npx prisma migrate dev --name init</code>{' '}
            to enable task tracking.
          </p>
          <p className="mt-1 text-amber-600 text-xs">Error: {dbError}</p>
        </div>
      )}

      {/* ── Board ─────────────────────────────────────────────────────── */}
      <TaskBoard initialTasks={tasks} />

    </div>
  )
}
