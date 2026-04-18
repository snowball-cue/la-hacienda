'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'
import type { ShiftRow, ShiftType } from '@/lib/schedule-types'

export type ScheduleResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }

// ── Validation ────────────────────────────────────────────────────────────────

const TIME_RE = /^\d{2}:\d{2}$/

const ShiftSchema = z.object({
  profileId: z.string().uuid('Select an employee.'),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid week start date.'),
  dayOfWeek: z.coerce.number().int().min(0).max(6, 'Invalid day of week.'),
  shiftType: z.string().optional().default('work'),
  startTime: z.string().regex(TIME_RE, 'Use HH:MM format (e.g. 09:00).').optional().default('00:00'),
  endTime:   z.string().regex(TIME_RE, 'Use HH:MM format (e.g. 17:00).').optional().default('00:00'),
  position:  z.string().max(100).trim().optional().nullable(),
  note:      z.string().max(500).trim().optional().nullable(),
}).refine(d => d.shiftType === 'day_off' || d.startTime < d.endTime, {
  message: 'End time must be after start time.',
  path: ['endTime'],
})

const MultiShiftSchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid week start date.'),
  shiftType: z.string().optional().default('work'),
  startTime: z.string().regex(TIME_RE, 'Use HH:MM format (e.g. 09:00).').optional().default('00:00'),
  endTime:   z.string().regex(TIME_RE, 'Use HH:MM format (e.g. 17:00).').optional().default('00:00'),
  position:  z.string().max(100).trim().optional().nullable(),
  note:      z.string().max(500).trim().optional().nullable(),
}).refine(d => d.shiftType === 'day_off' || d.startTime < d.endTime, {
  message: 'End time must be after start time.',
  path: ['endTime'],
})

// ── Helpers ───────────────────────────────────────────────────────────────────

type ShiftRecord = {
  id: string; profileId: string; weekStart: Date; dayOfWeek: number
  shiftType: string; startTime: string; endTime: string
  position: string | null; note: string | null
  storeId: string | null
  createdBy: string; createdAt: Date; updatedAt: Date
}

function buildShiftRow(
  shift: ShiftRecord,
  profileName: string,
  profilePhone: string | null = null,
  storeName: string | null = null,
): ShiftRow {
  return {
    id:          shift.id,
    profileId:   shift.profileId,
    profileName,
    weekStart:   shift.weekStart.toISOString().slice(0, 10),
    dayOfWeek:   shift.dayOfWeek,
    shiftType:   (shift.shiftType as ShiftType) ?? 'work',
    startTime:   shift.startTime,
    endTime:     shift.endTime,
    position:    shift.position,
    note:        shift.note,
    storeId:     shift.storeId,
    storeName,
    createdBy:   shift.createdBy,
    createdAt:   shift.createdAt.toISOString(),
    updatedAt:   shift.updatedAt.toISOString(),
    workerName:  profileName,
    workerEmail: null,
    workerPhone: profilePhone,
    isEmployee:  false,
    employeeId:  null,
  }
}

/**
 * Checks whether a new/updated shift overlaps with existing shifts for the same employee on the same day.
 * day_off blocks the entire day (treated as 00:00–23:59).
 * Returns an error string if there is a conflict, null if clear.
 */
async function checkOverlap(
  profileId: string,
  weekStart: Date,
  dayOfWeek: number,
  shiftType: string,
  startTime: string,
  endTime: string,
  excludeId?: string,
): Promise<string | null> {
  const existing = await prisma.schedule.findMany({
    where: {
      profileId,
      weekStart,
      dayOfWeek,
      isCancelled: false,
      ...(excludeId && { NOT: { id: excludeId } }),
    },
    select: { id: true, shiftType: true, startTime: true, endTime: true },
  })

  if (existing.length === 0) return null

  // Effective times for the new entry
  const newStart = shiftType === 'day_off' ? '00:00' : startTime
  const newEnd   = shiftType === 'day_off' ? '23:59' : endTime

  for (const s of existing) {
    const exStart = s.shiftType === 'day_off' ? '00:00' : s.startTime
    const exEnd   = s.shiftType === 'day_off' ? '23:59' : s.endTime

    // Overlap: new starts before existing ends AND new ends after existing starts
    if (newStart < exEnd && newEnd > exStart) {
      const typeLabel = s.shiftType === 'day_off' ? 'Day Off (full day)'
        : `${s.shiftType} from ${s.startTime}–${s.endTime}`
      return `Conflict: this employee already has a ${typeLabel} entry on that day.`
    }
  }
  return null
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getScheduleForWeek(
  weekStart: string,
  staffId?: string,
  storeIds?: string[],
): Promise<ScheduleResult<ShiftRow[]>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const isManager = hasMinimumRole(user.role, 'manager')

  try {
    let profileIdFilter: string[] | undefined
    if (isManager && storeIds && storeIds.length > 0) {
      // Show shifts for employees whose primary store is in the selected stores
      // OR shifts explicitly assigned to one of the selected stores
      const storeProfiles = await prisma.profile.findMany({
        where: { storeId: { in: storeIds } },
        select: { id: true },
      })
      profileIdFilter = storeProfiles.map(p => p.id)
    }

    const profileFilter = isManager
      ? profileIdFilter ? { profileId: { in: profileIdFilter } } : undefined
      : { profileId: staffId ?? user.id }

    const shifts = await prisma.schedule.findMany({
      where: {
        weekStart: new Date(weekStart),
        isCancelled: false,
        ...profileFilter,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    })

    const profileIds   = [...new Set(shifts.map(s => s.profileId))]
    const shiftStoreIds = [...new Set(shifts.map(s => s.storeId).filter(Boolean) as string[])]

    const [profiles, storeRecords] = await Promise.all([
      prisma.profile.findMany({
        where: { id: { in: profileIds } },
        select: { id: true, firstName: true, lastName: true, middleName: true, phone: true },
      }),
      shiftStoreIds.length > 0
        ? prisma.store.findMany({ where: { id: { in: shiftStoreIds } }, select: { id: true, name: true } })
        : [],
    ])

    const profileMap = new Map(profiles.map(p => [p.id, p]))
    const storeMap   = new Map(storeRecords.map(s => [s.id, s.name]))

    const rows = shifts.map(s => {
      const p = profileMap.get(s.profileId)
      return buildShiftRow(
        s,
        formatEmployeeName(p?.lastName, p?.firstName, p?.middleName),
        p?.phone ?? null,
        s.storeId ? (storeMap.get(s.storeId) ?? null) : null,
      )
    })
    return { success: true, data: rows }
  } catch {
    return { success: false, error: 'Failed to load schedule.' }
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createShift(
  _prev: ScheduleResult | null,
  formData: FormData,
): Promise<ScheduleResult<ShiftRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const shiftStoreId = (formData.get('storeId') as string) || null
  const shiftType    = (formData.get('shiftType') as string) || 'work'

  const parsed = ShiftSchema.safeParse({
    profileId: formData.get('profileId'),
    weekStart: formData.get('weekStart'),
    dayOfWeek: formData.get('dayOfWeek'),
    shiftType,
    startTime: shiftType === 'day_off' ? '00:00' : (formData.get('startTime') || undefined),
    endTime:   shiftType === 'day_off' ? '00:00' : (formData.get('endTime')   || undefined),
    position:  formData.get('position')  || null,
    note:      formData.get('note')      || null,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }
  const d = parsed.data

  // Overlap check
  const conflict = await checkOverlap(
    d.profileId, new Date(d.weekStart), d.dayOfWeek, d.shiftType, d.startTime, d.endTime,
  )
  if (conflict) return { success: false, error: conflict }

  try {
    const shift = await prisma.schedule.create({
      data: {
        profileId: d.profileId,
        weekStart: new Date(d.weekStart),
        dayOfWeek: d.dayOfWeek,
        shiftType: d.shiftType,
        startTime: d.startTime,
        endTime:   d.endTime,
        position:  d.position ?? null,
        note:      d.note ?? null,
        createdBy: user.id,
        ...(shiftStoreId && { storeId: shiftStoreId }),
      },
    })
    const [profile, store] = await Promise.all([
      prisma.profile.findUnique({ where: { id: shift.profileId }, select: { firstName: true, lastName: true, middleName: true, phone: true } }),
      shift.storeId ? prisma.store.findUnique({ where: { id: shift.storeId }, select: { name: true } }) : null,
    ])
    revalidatePath('/dashboard/schedule')
    return { success: true, data: buildShiftRow(shift, formatEmployeeName(profile?.lastName, profile?.firstName, profile?.middleName), profile?.phone ?? null, store?.name ?? null) }
  } catch {
    return { success: false, error: 'Failed to create shift.' }
  }
}

/**
 * Creates one shift per selected day of the week.
 * Used by the Add Shift modal when multiple days are checked.
 */
export async function createShifts(
  _prev: ScheduleResult<{ count: number }> | null,
  formData: FormData,
): Promise<ScheduleResult<{ count: number }>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const days = formData.getAll('dayOfWeek')
    .map(Number)
    .filter(d => !isNaN(d) && d >= 0 && d <= 6)

  if (days.length === 0) {
    return { success: false, error: 'Select at least one day.' }
  }

  // Support multiple employees (profileIds) — fall back to single profileId for backwards compat
  const rawProfileIds = formData.getAll('profileIds') as string[]
  const profileIds = rawProfileIds.length > 0
    ? rawProfileIds.filter(id => id.length > 0)
    : [formData.get('profileId') as string].filter(id => id?.length > 0)

  if (profileIds.length === 0) {
    return { success: false, error: 'Select at least one employee.' }
  }

  const storeId   = (formData.get('storeId') as string) || null
  const shiftType = (formData.get('shiftType') as string) || 'work'

  const parsed = MultiShiftSchema.safeParse({
    weekStart: formData.get('weekStart'),
    shiftType,
    startTime: shiftType === 'day_off' ? '00:00' : (formData.get('startTime') || undefined),
    endTime:   shiftType === 'day_off' ? '00:00' : (formData.get('endTime')   || undefined),
    position:  formData.get('position') || null,
    note:      formData.get('note')     || null,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }
  const d = parsed.data

  // Validate profileIds are UUIDs
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (profileIds.some(id => !uuidRe.test(id))) {
    return { success: false, error: 'Invalid employee selection.' }
  }

  // Overlap check for each employee × each day
  const { DAY_NAMES } = await import('@/lib/week-utils')
  for (const profileId of profileIds) {
    for (const day of days) {
      const conflict = await checkOverlap(
        profileId, new Date(d.weekStart), day, d.shiftType, d.startTime, d.endTime,
      )
      if (conflict) {
        const profile = await prisma.profile.findUnique({ where: { id: profileId }, select: { firstName: true, lastName: true, middleName: true } })
        const name = profile ? formatEmployeeName(profile.lastName, profile.firstName, profile.middleName) : profileId
        return { success: false, error: `${name} – ${DAY_NAMES[day]}: ${conflict}` }
      }
    }
  }

  try {
    const rows = profileIds.flatMap(profileId =>
      days.map(day => ({
        profileId,
        weekStart: new Date(d.weekStart),
        dayOfWeek: day,
        shiftType: d.shiftType,
        startTime: d.startTime,
        endTime:   d.endTime,
        position:  d.position ?? null,
        note:      d.note ?? null,
        createdBy: user.id,
        ...(storeId && { storeId }),
      }))
    )
    const result = await prisma.schedule.createMany({ data: rows, skipDuplicates: true })
    revalidatePath('/dashboard/schedule')
    return { success: true, data: { count: result.count } }
  } catch {
    return { success: false, error: 'Failed to create shifts.' }
  }
}

export async function updateShift(
  id: string,
  _prev: ScheduleResult | null,
  formData: FormData,
): Promise<ScheduleResult<ShiftRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const shiftStoreId = (formData.get('storeId') as string) || null
  const shiftType    = (formData.get('shiftType') as string) || 'work'

  const parsed = ShiftSchema.safeParse({
    profileId: formData.get('profileId'),
    weekStart: formData.get('weekStart'),
    dayOfWeek: formData.get('dayOfWeek'),
    shiftType,
    startTime: shiftType === 'day_off' ? '00:00' : (formData.get('startTime') || undefined),
    endTime:   shiftType === 'day_off' ? '00:00' : (formData.get('endTime')   || undefined),
    position:  formData.get('position')  || null,
    note:      formData.get('note')      || null,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }
  const d = parsed.data

  // Overlap check (exclude current shift)
  const conflict = await checkOverlap(
    d.profileId, new Date(d.weekStart), d.dayOfWeek, d.shiftType, d.startTime, d.endTime, id,
  )
  if (conflict) return { success: false, error: conflict }

  try {
    const shift = await prisma.schedule.update({
      where: { id },
      data: {
        profileId: d.profileId,
        weekStart: new Date(d.weekStart),
        dayOfWeek: d.dayOfWeek,
        shiftType: d.shiftType,
        startTime: d.startTime,
        endTime:   d.endTime,
        position:  d.position ?? null,
        note:      d.note ?? null,
        storeId:   shiftStoreId,
      },
    })
    const [profile, store] = await Promise.all([
      prisma.profile.findUnique({ where: { id: shift.profileId }, select: { firstName: true, lastName: true, middleName: true, phone: true } }),
      shift.storeId ? prisma.store.findUnique({ where: { id: shift.storeId }, select: { name: true } }) : null,
    ])
    revalidatePath('/dashboard/schedule')
    return { success: true, data: buildShiftRow(shift, formatEmployeeName(profile?.lastName, profile?.firstName, profile?.middleName), profile?.phone ?? null, store?.name ?? null) }
  } catch {
    return { success: false, error: 'Failed to update shift.' }
  }
}

export async function deleteShift(id: string): Promise<ScheduleResult> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    await prisma.schedule.delete({ where: { id } })
    revalidatePath('/dashboard/schedule')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to delete shift.' }
  }
}

export async function deleteShifts(ids: string[]): Promise<ScheduleResult<{ count: number }>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }
  if (ids.length === 0) return { success: true, data: { count: 0 } }

  // Validate all are UUIDs
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (ids.some(id => !uuidRe.test(id))) {
    return { success: false, error: 'Invalid shift IDs.' }
  }

  try {
    const result = await prisma.schedule.deleteMany({ where: { id: { in: ids } } })
    revalidatePath('/dashboard/schedule')
    return { success: true, data: { count: result.count } }
  } catch {
    return { success: false, error: 'Failed to delete shifts.' }
  }
}

export async function deleteWeekShifts(weekStart: string): Promise<ScheduleResult<{ count: number }>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    const result = await prisma.schedule.deleteMany({
      where: { weekStart: new Date(weekStart) },
    })
    revalidatePath('/dashboard/schedule')
    return { success: true, data: { count: result.count } }
  } catch {
    return { success: false, error: 'Failed to clear week.' }
  }
}

/**
 * Copies all shifts from one week to another.
 */
export async function copyWeek(
  fromWeekStart: string,
  toWeekStart:   string,
): Promise<ScheduleResult<{ count: number }>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    const existing = await prisma.schedule.findMany({
      where: { weekStart: new Date(fromWeekStart), isCancelled: false },
    })
    if (existing.length === 0) {
      return { success: false, error: 'No shifts found for the selected week.' }
    }

    await prisma.schedule.createMany({
      data: existing.map(s => ({
        profileId: s.profileId,
        weekStart: new Date(toWeekStart),
        dayOfWeek: s.dayOfWeek,
        shiftType: s.shiftType,
        startTime: s.startTime,
        endTime:   s.endTime,
        position:  s.position,
        note:      s.note,
        storeId:   s.storeId,
        createdBy: user.id,
      })),
      skipDuplicates: true,
    })

    revalidatePath('/dashboard/schedule')
    return { success: true, data: { count: existing.length } }
  } catch {
    return { success: false, error: 'Failed to copy week.' }
  }
}
