import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser, formatEmployeeName } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import UserAccessRow from './UserAccessRow'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (user.role !== 'owner') redirect('/dashboard')

  const profiles = await prisma.profile.findMany({
    orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    select: {
      id: true, role: true,
      firstName: true, lastName: true, middleName: true,
      allowedModules: true,
    },
  })

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-3xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-stone-500 mt-1">Owner-only configuration</p>
      </div>

      {/* ── User Management ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-stone-900">User Management</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Set roles and control which sections each manager can access.
            </p>
          </div>
          <span className="text-xs text-stone-400">{profiles.length} account{profiles.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="card divide-y divide-stone-100">
          {profiles.map((profile) => (
            <UserAccessRow
              key={profile.id}
              userId={profile.id}
              displayName={
                (profile.lastName || profile.firstName)
                  ? formatEmployeeName(profile.lastName, profile.firstName, profile.middleName)
                  : 'No name set'
              }
              role={profile.role}
              isCurrentUser={profile.id === user.id}
              allowedModules={profile.allowedModules}
            />
          ))}

          {profiles.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-stone-400">
              No user profiles found.
            </div>
          )}
        </div>

        {/* How to add users */}
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600 space-y-1">
          <p className="font-medium text-stone-700">How to add new staff accounts</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>Open the <strong>Supabase dashboard</strong> → Authentication → Users</li>
            <li>Click <strong>Invite user</strong> and enter the staff member&apos;s email</li>
            <li>They receive an email to set their password — a profile row is created automatically</li>
            <li>Return to this page and set their role (Staff or Manager)</li>
          </ol>
        </div>
      </section>

      {/* ── System Information ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-stone-900">System Information</h2>
        <div className="card divide-y divide-stone-100 text-sm">
          <div className="px-5 py-3 flex justify-between">
            <span className="text-stone-500">Application</span>
            <span className="font-medium text-stone-900">La Hacienda Inventory</span>
          </div>
          <div className="px-5 py-3 flex justify-between">
            <span className="text-stone-500">Database</span>
            <span className="font-medium text-stone-900">Supabase PostgreSQL + Prisma</span>
          </div>
          <div className="px-5 py-3 flex justify-between">
            <span className="text-stone-500">Deployment</span>
            <span className="font-medium text-stone-900">Vercel (iad1)</span>
          </div>
          <div className="px-5 py-3 flex justify-between">
            <span className="text-stone-500">Environment</span>
            <span className="font-medium text-stone-900">
              {process.env.NODE_ENV === 'production' ? (
                <span className="text-green-700">Production</span>
              ) : (
                <span className="text-amber-700">Development</span>
              )}
            </span>
          </div>
        </div>
      </section>

    </div>
  )
}
