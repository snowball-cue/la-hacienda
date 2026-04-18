'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'

export type TimeResult<T = unknown> =
  | { success: true;  data: T }
  | { success: false; error: string }

export interface TimeEntryRow {
  id:           string
  profileId:    string
  employeeName: string
  storeId:      string
  storeName:    string
  clockInAt:    string
  clockOutAt:   string | null
  breakMinutes: number
  hoursWorked:  string | null
  source:       string
  approvedBy:   string | null
}

type DbEntry = {
  id: string; profileId: string; storeId: string; clockInAt: Date
  clockOutAt: Date | null; breakMinutes: number; hoursWorked: unknown
  source: string; approvedBy: string | null
  profile: { firstName: string | null; lastName: string | null; middleName: string | null }
  store: { name: string }
}

function toRow(e: DbEntry): TimeEntryRow {
  return {
    id:           e.id,
    profileId:    e.profileId,
    employeeName: formatEmployeeName(e.profile.lastName, e.profile.firstName, e.profile.middleName),
    storeId:      e.storeId,
    storeName:    e.store.name,
    clockInAt:    e.clockInAt.toISOString(),
    clockOutAt:   e.clockOutAt?.toISOString() ?? null,
    breakMinutes: e.breakMinutes,
    hoursWorked:  e.hoursWorked != null ? String(e.hoursWorked) : null,
    source:       e.source,
    approvedBy:   e.approvedBy,
  }
}

// ── getTimeEntries ────────────────────────────────────────────────────────────

export async function getTimeEntries(filters?: {
  storeId?:    string
  profileId?:  string
  dateFrom?:   string
  dateTo?:     string
}): Promise<TimeResult<TimeEntryRow[]>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Unauthorized.' }
  }

  try {
    const db = prisma as unknown as {
      timeEntry: {
        findMany: (args: object) => Promise<DbEntry[]>
      }
    }

    const entries = await db.timeEntry.findMany({
      where: {
        ...(filters?.storeId   && { storeId:   filters.storeId }),
        ...(filters?.profileId && { profileId: filters.profileId }),
        ...(filters?.dateFrom  && { clockInAt: { gte: new Date(filters.dateFrom) } }),
        ...(filters?.dateTo    && { clockInAt: { lte: new Date(filters.dateTo + 'T23:59:59') } }),
      },
      include: {
        profile: { select: { firstName: true, lastName: true, middleName: true } },
        store:   { select: { name: true } },
      },
      orderBy: { clockInAt: 'desc' },
      take: 200,
    })

    return { success: true, data: entries.map(toRow) }
  } catch {
    return { success: false, error: 'Could not load time entries.' }
  }
}

// ── getOpenEntry ──────────────────────────────────────────────────────────────

export async function getOpenEntry(): Promise<TimeResult<TimeEntryRow | null>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized.' }

  try {
    const db = prisma as unknown as {
      timeEntry: {
        findFirst: (args: object) => Promise<DbEntry | null>
      }
    }

    const entry = await db.timeEntry.findFirst({
      where:   { profileId: user.id, clockOutAt: null },
      include: {
        profile: { select: { firstName: true, lastName: true, middleName: true } },
        store:   { select: { name: true } },
      },
      orderBy: { clockInAt: 'desc' },
    })

    return { success: true, data: entry ? toRow(entry) : null }
  } catch {
    return { success: false, error: 'Could not check clock status.' }
  }
}

// ── clockIn ───────────────────────────────────────────────────────────────────

const ClockInSchema = z.object({
  storeId: z.string().uuid('Select a store.'),
})

export async function clockIn(
  _prev: TimeResult | null,
  formData: FormData,
): Promise<TimeResult<TimeEntryRow>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized.' }

  const parsed = ClockInSchema.safeParse({ storeId: formData.get('storeId') })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  try {
    const db = prisma as unknown as {
      timeEntry: {
        findFirst: (args: object) => Promise<{ id: string } | null>
        create:    (args: object) => Promise<DbEntry>
      }
    }

    // Check for open entry
    const open = await db.timeEntry.findFirst({
      where: { profileId: user.id, clockOutAt: null },
    })
    if (open) return { success: false, error: 'You are already clocked in.' }

    const entry = await db.timeEntry.create({
      data: {
        profileId: user.id,
        storeId:   parsed.data.storeId,
        clockInAt: new Date(),
        source:    'manual',
      },
      include: {
        profile: { select: { firstName: true, lastName: true, middleName: true } },
        store:   { select: { name: true } },
      },
    })

    revalidatePath('/dashboard/timekeeping')
    return { success: true, data: toRow(entry) }
  } catch {
    return { success: false, error: 'Failed to clock in.' }
  }
}

// ── clockOut ──────────────────────────────────────────────────────────────────

const ClockOutSchema = z.object({
  breakMinutes: z.coerce.number().int().min(0).max(480).default(0),
})

export async function clockOut(
  entryId: string,
  _prev: TimeResult | null,
  formData: FormData,
): Promise<TimeResult<TimeEntryRow>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized.' }

  const parsed = ClockOutSchema.safeParse({
    breakMinutes: formData.get('breakMinutes') || 0,
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  try {
    const db = prisma as unknown as {
      timeEntry: {
        findUnique: (args: object) => Promise<{ profileId: string; clockInAt: Date; clockOutAt: Date | null } | null>
        update:     (args: object) => Promise<DbEntry>
      }
    }

    const entry = await db.timeEntry.findUnique({ where: { id: entryId } })
    if (!entry) return { success: false, error: 'Time entry not found.' }
    if (entry.profileId !== user.id && !hasMinimumRole(user.role, 'manager')) {
      return { success: false, error: 'Unauthorized.' }
    }
    if (entry.clockOutAt) return { success: false, error: 'Already clocked out.' }

    const clockOutAt  = new Date()
    const totalMins   = (clockOutAt.getTime() - entry.clockInAt.getTime()) / 60_000
    const workedMins  = totalMins - parsed.data.breakMinutes
    const hoursWorked = Math.max(0, workedMins / 60).toFixed(2)

    const updated = await db.timeEntry.update({
      where: { id: entryId },
      data: {
        clockOutAt,
        breakMinutes: parsed.data.breakMinutes,
        hoursWorked:  Number(hoursWorked),
      },
      include: {
        profile: { select: { firstName: true, lastName: true, middleName: true } },
        store:   { select: { name: true } },
      },
    })

    revalidatePath('/dashboard/timekeeping')
    return { success: true, data: toRow(updated) }
  } catch {
    return { success: false, error: 'Failed to clock out.' }
  }
}

// ── manualEntry ───────────────────────────────────────────────────────────────

const ManualEntrySchema = z.object({
  profileId:    z.string().uuid(),
  storeId:      z.string().uuid(),
  clockInAt:    z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)),
  clockOutAt:   z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)),
  breakMinutes: z.coerce.number().int().min(0).max(480).default(0),
})

export async function addManualTimeEntry(
  _prev: TimeResult | null,
  formData: FormData,
): Promise<TimeResult<TimeEntryRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  const parsed = ManualEntrySchema.safeParse({
    profileId:    formData.get('profileId'),
    storeId:      formData.get('storeId'),
    clockInAt:    formData.get('clockInAt'),
    clockOutAt:   formData.get('clockOutAt'),
    breakMinutes: formData.get('breakMinutes') || 0,
  })
  if (!parsed.success) return { success: false, error: parsed.error.errors[0].message }

  const inTime  = new Date(parsed.data.clockInAt)
  const outTime = new Date(parsed.data.clockOutAt)
  if (outTime <= inTime) return { success: false, error: 'Clock-out must be after clock-in.' }

  const totalMins  = (outTime.getTime() - inTime.getTime()) / 60_000
  const workedMins = totalMins - parsed.data.breakMinutes
  const hours      = Math.max(0, workedMins / 60).toFixed(2)

  try {
    const db = prisma as unknown as {
      timeEntry: {
        create: (args: object) => Promise<DbEntry>
      }
    }

    const entry = await db.timeEntry.create({
      data: {
        profileId:    parsed.data.profileId,
        storeId:      parsed.data.storeId,
        clockInAt:    inTime,
        clockOutAt:   outTime,
        breakMinutes: parsed.data.breakMinutes,
        hoursWorked:  Number(hours),
        source:       'manual',
        approvedBy:   user.id,
      },
      include: {
        profile: { select: { firstName: true, lastName: true, middleName: true } },
        store:   { select: { name: true } },
      },
    })

    revalidatePath('/dashboard/timekeeping')
    return { success: true, data: toRow(entry) }
  } catch {
    return { success: false, error: 'Failed to add time entry.' }
  }
}
