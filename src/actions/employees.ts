'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'

function dbError(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    if (err.code === 'P2002') {
      const target = (err as { meta?: { target?: string[] } }).meta?.target ?? []
      if (target.includes('employee_number')) return 'Employee # is already in use. Choose a different number.'
      if (target.includes('phone'))           return 'That phone number is already on another employee record.'
      return 'A duplicate value was found — check employee number and phone.'
    }
  }
  return 'Failed to save employee. Please try again.'
}

export type EmployeeResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }

export interface EmployeeRow {
  id:                       string
  /** Computed display name: "Last, First M." */
  fullName:                 string
  firstName:                string | null
  lastName:                 string | null
  middleName:               string | null
  position:                 string | null
  email:                    string | null
  phone:                    string | null
  address:                  string | null
  isActive:                 boolean
  notes:                    string | null
  createdAt:                string
  storeId:                  string | null
  storeName:                string | null
  role:                     string
  allowedModules:           string[]
  secondaryStoreIds:        string[]

  // Employment details
  hireDate:                 string | null
  exitDate:                 string | null
  exitReason:               string | null
  rehireEligible:           boolean
  payType:                  string
  employeeNumber:           string | null

  // Emergency contact
  emergencyContactName:     string | null
  emergencyContactPhone:    string | null
  emergencyContactRelation: string | null

  // Compliance
  foodHandlerCertExpiry:    string | null
  i9Verified:               boolean
  i9VerificationDate:       string | null
}

// ── Validation ────────────────────────────────────────────────────────────────

const EmployeeSchema = z.object({
  lastName:                 z.string().min(1, 'Last name is required.').max(100).trim(),
  firstName:                z.string().min(1, 'First name is required.').max(100).trim(),
  middleName:               z.string().max(100).trim().optional().nullable(),
  position:                 z.string().max(100).trim().optional().nullable(),
  email:                    z.string().email('Invalid email.').optional().or(z.literal('')).nullable(),
  phone:                    z.string().max(30).trim().optional().nullable(),
  address:                  z.string().max(300).trim().optional().nullable(),
  notes:                    z.string().max(500).trim().optional().nullable(),
  storeId:                  z.string().uuid().optional().nullable(),
  hireDate:                 z.string().optional().nullable(),
  exitDate:                 z.string().optional().nullable(),
  exitReason:               z.string().max(50).optional().nullable(),
  rehireEligible:           z.boolean().optional().default(true),
  payType:                  z.enum(['hourly', 'salary']).optional().default('hourly'),
  employeeNumber:           z.string().max(50).trim().optional().nullable(),
  emergencyContactName:     z.string().max(100).trim().optional().nullable(),
  emergencyContactPhone:    z.string().max(30).trim().optional().nullable(),
  emergencyContactRelation: z.string().max(50).trim().optional().nullable(),
  foodHandlerCertExpiry:    z.string().optional().nullable(),
  i9Verified:               z.boolean().optional().default(false),
  i9VerificationDate:       z.string().optional().nullable(),
  role:                     z.enum(['owner', 'manager', 'staff']).optional().default('staff'),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROFILE_SELECT = {
  id: true, role: true, firstName: true, lastName: true, middleName: true, position: true, phone: true,
  email: true, address: true, notes: true,
  isActive: true, createdAt: true,
  storeId: true, secondaryStoreIds: true, allowedModules: true,
  store: { select: { name: true } },
  hireDate: true, exitDate: true, exitReason: true,
  rehireEligible: true, payType: true, employeeNumber: true,
  emergencyContactName: true, emergencyContactPhone: true, emergencyContactRelation: true,
  foodHandlerCertExpiry: true, i9Verified: true, i9VerificationDate: true,
} as const

// Derive the exact return type from PROFILE_SELECT — avoids manual duplication
type ProfileRecord = Prisma.ProfileGetPayload<{ select: typeof PROFILE_SELECT }>

function mapRow(p: ProfileRecord): EmployeeRow {
  return {
    id:                       p.id,
    role:                     p.role,
    allowedModules:           p.allowedModules,
    firstName:                p.firstName  ?? null,
    lastName:                 p.lastName   ?? null,
    middleName:               p.middleName ?? null,
    fullName:                 formatEmployeeName(p.lastName, p.firstName, p.middleName),
    position:                 p.position,
    email:                    p.email   ?? null,
    phone:                    p.phone   ?? null,
    address:                  p.address ?? null,
    isActive:                 p.isActive,
    notes:                    p.notes   ?? null,
    createdAt:                p.createdAt.toISOString(),
    storeId:                  p.storeId,
    storeName:                p.store?.name ?? null,
    secondaryStoreIds:        p.secondaryStoreIds,
    hireDate:                 p.hireDate ? p.hireDate.toISOString().slice(0, 10) : null,
    exitDate:                 p.exitDate ? p.exitDate.toISOString().slice(0, 10) : null,
    exitReason:               p.exitReason,
    rehireEligible:           p.rehireEligible,
    payType:                  p.payType,
    employeeNumber:           p.employeeNumber,
    emergencyContactName:     p.emergencyContactName,
    emergencyContactPhone:    p.emergencyContactPhone,
    emergencyContactRelation: p.emergencyContactRelation,
    foodHandlerCertExpiry:    p.foodHandlerCertExpiry ? p.foodHandlerCertExpiry.toISOString().slice(0, 10) : null,
    i9Verified:               p.i9Verified,
    i9VerificationDate:       p.i9VerificationDate ? p.i9VerificationDate.toISOString().slice(0, 10) : null,
  }
}

type SortField = 'lastName' | 'position' | 'phone' | 'storeName' | 'hireDate' | 'isActive'

function buildOrderBy(sort: SortField, dir: 'asc' | 'desc'): Prisma.ProfileOrderByWithRelationInput {
  switch (sort) {
    case 'storeName': return { store: { name: dir } }
    case 'position':  return { position: dir }
    case 'phone':     return { phone: dir }
    case 'hireDate':  return { hireDate: dir }
    case 'isActive':  return { isActive: dir }
    default:          return { lastName: dir }
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getEmployees(
  filter: 'active' | 'inactive' | 'all' = 'active',
  storeIds?: string[],
  sort: SortField = 'lastName',
  dir: 'asc' | 'desc' = 'asc',
): Promise<EmployeeResult<EmployeeRow[]>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    const storeFilter = storeIds && storeIds.length > 0 ? { storeId: { in: storeIds } } : {}
    const activeFilter = filter === 'active' ? { isActive: true } : filter === 'inactive' ? { isActive: false } : {}
    const profiles = await prisma.profile.findMany({
      where: { ...activeFilter, ...storeFilter },
      orderBy: buildOrderBy(sort, dir),
      select: PROFILE_SELECT,
    })
    return { success: true, data: profiles.map(mapRow) }
  } catch {
    return { success: false, error: 'Failed to load employees.' }
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createEmployee(
  _prev: EmployeeResult<EmployeeRow> | null,
  formData: FormData,
): Promise<EmployeeResult<EmployeeRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const rawSecondary = formData.getAll('secondaryStoreIds') as string[]
  const secondaryStoreIds = rawSecondary.filter(id => id.match(/^[0-9a-f-]{36}$/i))

  const parsed = EmployeeSchema.safeParse({
    lastName:                 formData.get('lastName'),
    firstName:                formData.get('firstName'),
    middleName:               formData.get('middleName')               || null,
    position:                 formData.get('position')                 || null,
    email:                    formData.get('email')                    || null,
    phone:                    formData.get('phone')                    || null,
    address:                  formData.get('address')                  || null,
    notes:                    formData.get('notes')                    || null,
    storeId:                  formData.get('storeId')                  || null,
    hireDate:                 formData.get('hireDate')                 || null,
    exitDate:                 formData.get('exitDate')                 || null,
    exitReason:               formData.get('exitReason')               || null,
    rehireEligible:           formData.get('rehireEligible') === 'true',
    payType:                  formData.get('payType')                  || 'hourly',
    employeeNumber:           formData.get('employeeNumber')           || null,
    emergencyContactName:     formData.get('emergencyContactName')     || null,
    emergencyContactPhone:    formData.get('emergencyContactPhone')    || null,
    emergencyContactRelation: formData.get('emergencyContactRelation') || null,
    foodHandlerCertExpiry:    formData.get('foodHandlerCertExpiry')    || null,
    i9Verified:               formData.get('i9Verified') === 'true',
    i9VerificationDate:       formData.get('i9VerificationDate')       || null,
    role:                     formData.get('role')                     || 'staff',
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }
  const d = parsed.data

  // Only owners can assign roles above staff
  const assignedRole = (user.role === 'owner' && d.role) ? d.role : 'staff'

  try {
    const profile = await prisma.profile.create({
      data: {
        id:                       randomUUID(),
        lastName:                 d.lastName,
        firstName:                d.firstName,
        middleName:               d.middleName        ?? null,
        position:                 d.position         ?? null,
        phone:                    d.phone            ?? null,
        email:                    d.email            ?? null,
        address:                  d.address          ?? null,
        notes:                    d.notes            ?? null,
        role:                     assignedRole,
        isActive:                 true,
        storeId:                  d.storeId          ?? null,
        secondaryStoreIds,
        hireDate:                 d.hireDate         ? new Date(d.hireDate)              : null,
        exitDate:                 d.exitDate         ? new Date(d.exitDate)              : null,
        exitReason:               d.exitReason       ?? null,
        rehireEligible:           d.rehireEligible,
        payType:                  d.payType,
        employeeNumber:           d.employeeNumber   ?? null,
        emergencyContactName:     d.emergencyContactName     ?? null,
        emergencyContactPhone:    d.emergencyContactPhone    ?? null,
        emergencyContactRelation: d.emergencyContactRelation ?? null,
        foodHandlerCertExpiry:    d.foodHandlerCertExpiry ? new Date(d.foodHandlerCertExpiry) : null,
        i9Verified:               d.i9Verified,
        i9VerificationDate:       d.i9VerificationDate ? new Date(d.i9VerificationDate) : null,
      },
      select: PROFILE_SELECT,
    })
    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard/schedule')
    return { success: true, data: mapRow(profile) }
  } catch (err) {
    return { success: false, error: dbError(err) }
  }
}

export async function updateEmployee(
  id: string,
  _prev: EmployeeResult<EmployeeRow> | null,
  formData: FormData,
): Promise<EmployeeResult<EmployeeRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const rawSecondary = formData.getAll('secondaryStoreIds') as string[]
  const secondaryStoreIds = rawSecondary.filter(id => id.match(/^[0-9a-f-]{36}$/i))

  const parsed = EmployeeSchema.safeParse({
    lastName:                 formData.get('lastName'),
    firstName:                formData.get('firstName'),
    middleName:               formData.get('middleName')               || null,
    position:                 formData.get('position')                 || null,
    email:                    formData.get('email')                    || null,
    phone:                    formData.get('phone')                    || null,
    address:                  formData.get('address')                  || null,
    notes:                    formData.get('notes')                    || null,
    storeId:                  formData.get('storeId')                  || null,
    hireDate:                 formData.get('hireDate')                 || null,
    exitDate:                 formData.get('exitDate')                 || null,
    exitReason:               formData.get('exitReason')               || null,
    rehireEligible:           formData.get('rehireEligible') === 'true',
    payType:                  formData.get('payType')                  || 'hourly',
    employeeNumber:           formData.get('employeeNumber')           || null,
    emergencyContactName:     formData.get('emergencyContactName')     || null,
    emergencyContactPhone:    formData.get('emergencyContactPhone')    || null,
    emergencyContactRelation: formData.get('emergencyContactRelation') || null,
    foodHandlerCertExpiry:    formData.get('foodHandlerCertExpiry')    || null,
    i9Verified:               formData.get('i9Verified') === 'true',
    i9VerificationDate:       formData.get('i9VerificationDate')       || null,
    role:                     formData.get('role')                     || 'staff',
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }
  const d = parsed.data

  // Only owners can change roles and module access
  const ownerFields: Record<string, unknown> = {}
  if (user.role === 'owner') {
    ownerFields.role = d.role
    const rawModules = formData.getAll('allowedModules') as string[]
    ownerFields.allowedModules = rawModules.filter(m => typeof m === 'string' && m.length > 0)
  }

  try {
    const profile = await prisma.profile.update({
      where: { id },
      data: {
        lastName:                 d.lastName,
        firstName:                d.firstName,
        middleName:               d.middleName        ?? null,
        position:                 d.position         ?? null,
        phone:                    d.phone            ?? null,
        email:                    d.email            ?? null,
        address:                  d.address          ?? null,
        notes:                    d.notes            ?? null,
        storeId:                  d.storeId          ?? null,
        secondaryStoreIds,
        hireDate:                 d.hireDate         ? new Date(d.hireDate)              : null,
        exitDate:                 d.exitDate         ? new Date(d.exitDate)              : null,
        exitReason:               d.exitReason       ?? null,
        rehireEligible:           d.rehireEligible,
        payType:                  d.payType,
        employeeNumber:           d.employeeNumber   ?? null,
        emergencyContactName:     d.emergencyContactName     ?? null,
        emergencyContactPhone:    d.emergencyContactPhone    ?? null,
        emergencyContactRelation: d.emergencyContactRelation ?? null,
        foodHandlerCertExpiry:    d.foodHandlerCertExpiry ? new Date(d.foodHandlerCertExpiry) : null,
        i9Verified:               d.i9Verified,
        i9VerificationDate:       d.i9VerificationDate ? new Date(d.i9VerificationDate) : null,
        ...ownerFields,
      },
      select: PROFILE_SELECT,
    })
    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard/schedule')
    return { success: true, data: mapRow(profile) }
  } catch (err) {
    return { success: false, error: dbError(err) }
  }
}

export async function deactivateEmployee(
  id: string,
  exitReason?: string,
  exitDate?: string,
): Promise<EmployeeResult> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    await prisma.profile.update({
      where: { id },
      data: {
        isActive:   false,
        exitDate:   exitDate ? new Date(exitDate) : new Date(),
        exitReason: exitReason ?? null,
      },
    })
    revalidatePath('/dashboard/employees')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to deactivate employee.' }
  }
}

export async function deleteEmployee(id: string): Promise<EmployeeResult> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    await prisma.profile.delete({ where: { id } })
    revalidatePath('/dashboard/employees')
    revalidatePath('/dashboard/schedule')
    return { success: true, data: undefined }
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2003') {
      return { success: false, error: 'This employee has linked records (shifts, time entries, etc.) and cannot be deleted. Use Deactivate instead.' }
    }
    return { success: false, error: 'Failed to delete employee.' }
  }
}

export async function reactivateEmployee(id: string): Promise<EmployeeResult> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    await prisma.profile.update({
      where: { id },
      data: { isActive: true, exitDate: null, exitReason: null },
    })
    revalidatePath('/dashboard/employees')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to reactivate employee.' }
  }
}
