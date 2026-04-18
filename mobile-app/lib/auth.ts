import { supabase } from './supabase'

export type UserRole = 'owner' | 'manager' | 'staff'

export interface MobileUser {
  id:             string
  email:          string
  role:           UserRole
  firstName:      string | null
  lastName:       string | null
  fullName:       string | null
  allowedModules: string[]
  storeId:        string | null
}

export function formatName(
  lastName:   string | null | undefined,
  firstName:  string | null | undefined,
): string {
  const l = lastName?.trim() || ''
  const f = firstName?.trim() || ''
  if (!l && !f) return 'Unknown'
  if (!f) return l
  if (!l) return f
  return `${l}, ${f}`
}

export async function getProfile(userId: string, fallbackEmail = ''): Promise<MobileUser> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, first_name, last_name, allowed_modules, store_id')
    .eq('id', userId)
    .single()

  if (error || !data) {
    // Profile missing or RLS blocking read — return a minimal authenticated user.
    // Add the SQL policy below in Supabase to fix this properly:
    //   CREATE POLICY "users_read_own_profile" ON profiles
    //   FOR SELECT TO authenticated USING (auth.uid() = id);
    return {
      id:             userId,
      email:          fallbackEmail,
      role:           'staff',
      firstName:      null,
      lastName:       null,
      fullName:       null,
      allowedModules: [],
      storeId:        null,
    }
  }

  return {
    id:             data.id,
    email:          fallbackEmail,
    role:           (data.role ?? 'staff') as UserRole,
    firstName:      data.first_name ?? null,
    lastName:       data.last_name  ?? null,
    fullName:       formatName(data.last_name, data.first_name),
    allowedModules: data.allowed_modules ?? [],
    storeId:        data.store_id ?? null,
  }
}

export function hasModuleAccess(user: MobileUser, module: string): boolean {
  if (user.role === 'owner') return true
  if (user.role === 'staff') return true
  if (user.allowedModules.length === 0) return true
  return user.allowedModules.includes(module)
}

export function hasMinimumRole(userRole: UserRole, required: UserRole): boolean {
  const rank: Record<UserRole, number> = { owner: 3, manager: 2, staff: 1 }
  return rank[userRole] >= rank[required]
}
