'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'
import { calendarDays } from '@/lib/schedule-types'
import type { TimeOffRow, TimeOffType, TimeOffStatus } from '@/lib/schedule-types'

export type TimeOffResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }

// ── Validation ────────────────────────────────────────────────────────────────

const TIME_OFF_TYPES   = ['vacation', 'sick', 'personal', 'holiday'] as const
const TIME_OFF_STATUSES = ['pending', 'approved', 'denied'] as const

const RequestSchema = z.object({
  type:      z.enum(TIME_OFF_TYPES),
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date.'),
  dateEnd:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date.'),
  note:      z.string().max(500).trim().optional().nullable(),
}).refine(d => d.dateEnd >= d.dateStart, {
  message: 'End date must be on or after start date.',
  path: ['dateEnd'],
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapRow(
  r: {
    id: string; profileId: string; type: string; dateStart: Date; dateEnd: Date
    totalDays: number; status: string; note: string | null; approvedBy: string | null
    approvedAt: Date | null; createdAt: Date
  },
  profileName: string,
): TimeOffRow {
  return {
    id:          r.id,
    profileId:   r.profileId,
    profileName,
    type:        r.type   as TimeOffType,
    dateStart:   r.dateStart.toISOString().slice(0, 10),
    dateEnd:     r.dateEnd.toISOString().slice(0, 10),
    totalDays:   r.totalDays,
    status:      r.status as TimeOffStatus,
    note:        r.note,
    approvedBy:  r.approvedBy,
    approvedAt:  r.approvedAt?.toISOString() ?? null,
    createdAt:   r.createdAt.toISOString(),
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch time-off requests.
 * Manager/owner → all employees (optionally filtered by profileId).
 * Staff → only their own.
 */
export async function getTimeOffRequests(
  filters?: { profileId?: string; status?: string },
): Promise<TimeOffResult<TimeOffRow[]>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const isManager = hasMinimumRole(user.role, 'manager')

  try {
    const where: {
      profileId?: string
      status?: string
    } = {
      ...(isManager
        ? (filters?.profileId ? { profileId: filters.profileId } : {})
        : { profileId: user.id }),
      ...(filters?.status && TIME_OFF_STATUSES.includes(filters.status as TimeOffStatus)
        ? { status: filters.status }
        : {}),
    }

    const requests = await prisma.timeOffRequest.findMany({
      where,
      orderBy: [{ dateStart: 'desc' }],
    })

    const profileIds: string[] = [...new Set(requests.map(r => r.profileId))]
    const profiles   = await prisma.profile.findMany({
      where:  { id: { in: profileIds } },
      select: { id: true, firstName: true, lastName: true, middleName: true },
    })
    const nameMap = new Map(profiles.map(p => [p.id, formatEmployeeName(p.lastName, p.firstName, p.middleName)]))

    return {
      success: true,
      data: requests.map(r => mapRow(r, nameMap.get(r.profileId) ?? 'Unknown')),
    }
  } catch {
    return { success: false, error: 'Failed to load time-off requests.' }
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Submit a new time-off request (any role — self only). */
export async function createTimeOffRequest(
  _prev: TimeOffResult | null,
  formData: FormData,
): Promise<TimeOffResult<TimeOffRow>> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const parsed = RequestSchema.safeParse({
    type:      formData.get('type'),
    dateStart: formData.get('dateStart'),
    dateEnd:   formData.get('dateEnd'),
    note:      formData.get('note') || null,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }
  const d = parsed.data
  const days = calendarDays(d.dateStart, d.dateEnd)

  try {
    const req = await prisma.timeOffRequest.create({
      data: {
        profileId: user.id,
        type:      d.type,
        dateStart: new Date(d.dateStart),
        dateEnd:   new Date(d.dateEnd),
        totalDays: days,
        status:    'pending',
        note:      d.note ?? null,
        createdBy: user.id,
      },
    })
    const profile = await prisma.profile.findUnique({
      where: { id: user.id }, select: { firstName: true, lastName: true, middleName: true },
    })
    revalidatePath('/dashboard/schedule/time-off')
    return { success: true, data: mapRow(req, formatEmployeeName(profile?.lastName, profile?.firstName, profile?.middleName)) }
  } catch {
    return { success: false, error: 'Failed to submit request.' }
  }
}

/** Approve a time-off request (manager/owner only). */
export async function approveTimeOffRequest(id: string): Promise<TimeOffResult> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    await prisma.timeOffRequest.update({
      where: { id },
      data: {
        status:     'approved',
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    })
    revalidatePath('/dashboard/schedule/time-off')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to approve request.' }
  }
}

/** Deny a time-off request (manager/owner only). */
export async function denyTimeOffRequest(id: string): Promise<TimeOffResult> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    await prisma.timeOffRequest.update({
      where: { id },
      data: {
        status:     'denied',
        approvedBy: user.id,
        approvedAt: new Date(),
      },
    })
    revalidatePath('/dashboard/schedule/time-off')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to deny request.' }
  }
}

/** Cancel/delete a pending request (staff can only cancel their own). */
export async function cancelTimeOffRequest(id: string): Promise<TimeOffResult> {
  const user = await getAuthUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  try {
    const existing = await prisma.timeOffRequest.findUnique({ where: { id } })
    if (!existing) return { success: false, error: 'Request not found.' }

    const isManager = hasMinimumRole(user.role, 'manager')
    if (!isManager && existing.profileId !== user.id) {
      return { success: false, error: 'You can only cancel your own requests.' }
    }
    if (existing.status !== 'pending' && !isManager) {
      return { success: false, error: 'Only pending requests can be cancelled.' }
    }

    await prisma.timeOffRequest.delete({ where: { id } })
    revalidatePath('/dashboard/schedule/time-off')
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to cancel request.' }
  }
}
