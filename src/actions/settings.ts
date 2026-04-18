'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole, isRole } from '@/lib/auth'
import type { UserRole } from '@/lib/auth'

export type SettingsResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }

const VALID_ROLES: UserRole[] = ['owner', 'manager', 'staff']

export async function assignStore(
  userId: string,
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const user = await getAuthUser()
  if (!user || !isRole(user.role, 'owner')) {
    return { success: false, error: 'Only the owner can assign stores.' }
  }

  const storeId = (formData.get('storeId') as string) || null

  try {
    await prisma.profile.update({
      where: { id: userId },
      data:  { storeId },
    })
    revalidatePath('/dashboard/settings')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to assign store.' }
  }
}

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable()

const EmployeeDatesSchema = z.object({
  hireDate: dateField,
  exitDate: dateField,
})

export async function updateEmployeeDates(
  userId: string,
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const raw = {
    hireDate: (formData.get('hireDate') as string) || null,
    exitDate: (formData.get('exitDate') as string) || null,
  }
  const parsed = EmployeeDatesSchema.safeParse(raw)
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  try {
    await prisma.profile.update({
      where: { id: userId },
      data: {
        hireDate: parsed.data.hireDate ? new Date(parsed.data.hireDate) : null,
        exitDate: parsed.data.exitDate ? new Date(parsed.data.exitDate) : null,
      },
    })
    revalidatePath('/dashboard/employees')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to update employee dates.' }
  }
}

const EmployeeProfileSchema = z.object({
  hireDate:                  dateField,
  exitDate:                  dateField,
  foodHandlerCertExpiry:     dateField,
  i9VerificationDate:        dateField,
  position:                  z.string().max(200).trim().nullable().optional(),
  employeeNumber:            z.string().max(50).trim().nullable().optional(),
  payType:                   z.enum(['hourly', 'salary']).nullable().optional(),
  phone:                     z.string().max(50).trim().nullable().optional(),
  emergencyContactName:      z.string().max(200).trim().nullable().optional(),
  emergencyContactPhone:     z.string().max(50).trim().nullable().optional(),
  emergencyContactRelation:  z.string().max(100).trim().nullable().optional(),
  i9Verified:                z.preprocess(v => v === 'true' || v === true, z.boolean()).default(false),
})

export async function updateEmployeeProfile(
  userId: string,
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const parsed = EmployeeProfileSchema.safeParse({
    hireDate:                  (formData.get('hireDate') as string)                 || null,
    exitDate:                  (formData.get('exitDate') as string)                 || null,
    foodHandlerCertExpiry:     (formData.get('foodHandlerCertExpiry') as string)    || null,
    i9VerificationDate:        (formData.get('i9VerificationDate') as string)       || null,
    position:                  (formData.get('position') as string)                 || null,
    employeeNumber:            (formData.get('employeeNumber') as string)           || null,
    payType:                   (formData.get('payType') as string)                  || null,
    phone:                     (formData.get('phone') as string)                    || null,
    emergencyContactName:      (formData.get('emergencyContactName') as string)     || null,
    emergencyContactPhone:     (formData.get('emergencyContactPhone') as string)    || null,
    emergencyContactRelation:  (formData.get('emergencyContactRelation') as string) || null,
    i9Verified:                formData.get('i9Verified'),
  })

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }

  const toDate = (s: string | null | undefined) => (s ? new Date(s) : null)

  try {
    await prisma.profile.update({
      where: { id: userId },
      data: {
        hireDate:  toDate(parsed.data.hireDate),
        exitDate:  toDate(parsed.data.exitDate),
        // Phase 5 fields — guarded for pre-migration safety
        ...(parsed.data.position        !== undefined && { position:       parsed.data.position       ?? null }),
        ...(parsed.data.employeeNumber  !== undefined && { employeeNumber: parsed.data.employeeNumber ?? null }),
        ...(parsed.data.payType         !== undefined && { payType:        parsed.data.payType        ?? 'hourly' }),
        ...(parsed.data.phone           !== undefined && { phone:          parsed.data.phone          ?? null }),
        ...(parsed.data.emergencyContactName     !== undefined && { emergencyContactName:     parsed.data.emergencyContactName     ?? null }),
        ...(parsed.data.emergencyContactPhone    !== undefined && { emergencyContactPhone:    parsed.data.emergencyContactPhone    ?? null }),
        ...(parsed.data.emergencyContactRelation !== undefined && { emergencyContactRelation: parsed.data.emergencyContactRelation ?? null }),
        ...(parsed.data.foodHandlerCertExpiry    !== undefined && { foodHandlerCertExpiry:    toDate(parsed.data.foodHandlerCertExpiry) }),
        ...(parsed.data.i9VerificationDate       !== undefined && { i9VerificationDate:       toDate(parsed.data.i9VerificationDate) }),
        i9Verified: parsed.data.i9Verified,
      },
    })
    revalidatePath('/dashboard/employees')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to update employee profile.' }
  }
}

export async function changeUserModules(
  userId: string,
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const user = await getAuthUser()
  if (!user || !isRole(user.role, 'owner')) {
    return { success: false, error: 'Only the owner can change module access.' }
  }

  const modules = (formData.getAll('allowedModules') as string[]).filter(Boolean)

  try {
    await prisma.profile.update({
      where: { id: userId },
      data:  { allowedModules: modules },
    })
    revalidatePath('/dashboard/settings')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to update module access.' }
  }
}

export async function changeUserRole(
  userId: string,
  _prev: SettingsResult | null,
  formData: FormData,
): Promise<SettingsResult> {
  const user = await getAuthUser()
  if (!user || !isRole(user.role, 'owner')) {
    return { success: false, error: 'Only the owner can change user roles.' }
  }

  const newRole = formData.get('role') as string
  if (!VALID_ROLES.includes(newRole as UserRole)) {
    return { success: false, error: 'Invalid role.' }
  }

  // Owners cannot demote themselves — prevents lockout
  if (userId === user.id && newRole !== 'owner') {
    return { success: false, error: 'You cannot change your own role.' }
  }

  try {
    await prisma.profile.update({
      where: { id: userId },
      data:  { role: newRole },
    })
    revalidatePath('/dashboard/settings')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to update role.' }
  }
}
