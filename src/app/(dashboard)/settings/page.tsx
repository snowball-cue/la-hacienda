import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthUser, formatEmployeeName } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStores } from '@/actions/inventory'
import RoleForm from './RoleForm'
import StoreForm from './StoreForm'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')
  if (user.role !== 'owner') redirect('/dashboard')

  const [profiles, stores] = await Promise.all([
    prisma.profile.findMany({
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
      include: { store: true },
    }),
    getStores(),
  ])

  const roleBadge: Record<string, string> = {
    owner:   'bg-gold/20 text-yellow-800',
    manager: 'bg-blue-100 text-blue-800',
    staff:   'bg-stone-100 text-stone-600',
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-3xl">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-stone-500 mt-1">Owner-only configuration</p>
      </div>

      {/* ── User Management ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900">User Management</h2>
          <span className="text-xs text-stone-400">{profiles.length} account{profiles.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="card divide-y divide-stone-100">
          {profiles.map((profile) => (
            <div key={profile.id} className="px-5 py-4 flex items-center gap-4">
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-stone-500 uppercase">
                  {(profile.lastName ?? profile.firstName ?? 'U').charAt(0)}
                </span>
              </div>

              {/* Name + role badge */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {(profile.lastName || profile.firstName)
                    ? formatEmployeeName(profile.lastName, profile.firstName, profile.middleName)
                    : <span className="text-stone-400 italic">No name set</span>}
                </p>
                <span className={`badge text-[10px] uppercase tracking-wide ${roleBadge[profile.role] ?? 'bg-stone-100 text-stone-600'}`}>
                  {profile.role}
                </span>
              </div>

              {/* Store + Role */}
              <div className="shrink-0 flex flex-col sm:flex-row items-end sm:items-center gap-2">
                <StoreForm
                  userId={profile.id}
                  currentStoreId={profile.storeId}
                  stores={stores}
                  isCurrentUser={profile.id === user.id}
                />
                <RoleForm
                  userId={profile.id}
                  currentRole={profile.role}
                  isCurrentUser={profile.id === user.id}
                />
              </div>
            </div>
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
