/**
 * /setup — First-time owner profile creation.
 *
 * Runs when a Supabase auth user exists but has no profile row (e.g. after a
 * database reset during development). Creates the profile as 'owner' if no
 * profiles exist yet, otherwise as 'staff'. Redirects to /dashboard on success.
 *
 * This page is also the target from DashboardLayout when getAuthUser() returns
 * null for an authenticated Supabase user, breaking the /login ↔ /dashboard
 * redirect loop.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not authenticated at all → go to login
  if (!user) redirect('/login')

  // Already has a profile → go to dashboard
  const existing = await prisma.profile.findUnique({ where: { id: user.id } })
  if (existing) redirect('/dashboard')

  // Determine role: first profile gets 'owner', subsequent get 'staff'
  const profileCount = await prisma.profile.count()
  const role = profileCount === 0 ? 'owner' : 'staff'

  // Create the profile
  await prisma.profile.create({
    data: {
      id:       user.id,
      firstName: (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'User',
      lastName:  (user.user_metadata?.full_name as string | undefined)?.split(' ').slice(1).join(' ') || null,
      role,
    },
  })

  redirect('/dashboard')
}
