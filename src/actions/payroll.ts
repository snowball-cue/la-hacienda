'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthUser, hasMinimumRole, formatEmployeeName } from '@/lib/auth'
import {
  computeScheduledHours,
  splitOvertimeHours,
  computeGrossPay,
  weekStartsInRange,
} from '@/lib/payroll-utils'

export type PayrollResult<T = void> =
  | { success: true;  data: T }
  | { success: false; error: string }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PeriodRow {
  id:          string
  periodStart: string   // "YYYY-MM-DD"
  periodEnd:   string   // "YYYY-MM-DD"
  frequency:   'weekly' | 'biweekly'
  status:      'open' | 'closed'
  createdBy:   string
  createdAt:   string
  entryCount:  number
}

export interface PayrollDetailRow {
  profileId:      string
  profileName:    string
  scheduledHours: number
  actualHours:    number | null
  effectiveHours: number
  regularHours:   number
  overtimeHours:  number
  hourlyRate:     string | null
  grossPay:       string | null
  note:           string | null
  entryId:        string | null
}

// ── Validation ────────────────────────────────────────────────────────────────

const PeriodSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date.'),
  periodEnd:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date.'),
  frequency:   z.enum(['weekly', 'biweekly']),
}).refine(d => d.periodStart <= d.periodEnd, {
  message: 'End date must be on or after start date.',
  path: ['periodEnd'],
})

const EntrySchema = z.object({
  profileId:   z.string().uuid(),
  actualHours: z.preprocess(v => v === '' ? null : v,
    z.coerce.number().min(0).max(168).nullable().optional()
  ),
  hourlyRate: z.preprocess(v => v === '' ? null : v,
    z.string().regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid rate like 15.00.').nullable().optional()
  ),
  note: z.string().max(500).trim().optional().nullable(),
})

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getPayrollPeriods(): Promise<PayrollResult<PeriodRow[]>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    const periods = await prisma.payrollPeriod.findMany({
      orderBy: { periodStart: 'desc' },
      include: { _count: { select: { entries: true } } },
    })
    return {
      success: true,
      data: periods.map(p => ({
        id:          p.id,
        periodStart: p.periodStart.toISOString().slice(0, 10),
        periodEnd:   p.periodEnd.toISOString().slice(0, 10),
        frequency:   p.frequency as 'weekly' | 'biweekly',
        status:      p.status as 'open' | 'closed',
        createdBy:   p.createdBy,
        createdAt:   p.createdAt.toISOString(),
        entryCount:  p._count.entries,
      })),
    }
  } catch {
    return { success: false, error: 'Failed to load payroll periods.' }
  }
}

/**
 * Computes the full payroll detail for a period.
 * Scheduled hours are calculated from the Schedule table — not stored redundantly.
 * Bi-weekly periods compute overtime per week independently (FLSA requirement).
 */
export async function getPayrollDetail(periodId: string): Promise<PayrollResult<{ period: PeriodRow; rows: PayrollDetailRow[] }>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  try {
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: periodId },
      include: { entries: true, _count: { select: { entries: true } } },
    })
    if (!period) return { success: false, error: 'Period not found.' }

    const [profiles, shifts] = await Promise.all([
      prisma.profile.findMany({ orderBy: { lastName: 'asc' } }),
      prisma.schedule.findMany({
        where: {
          weekStart: { gte: period.periodStart, lte: period.periodEnd },
        },
      }),
    ])

    // For biweekly periods, compute overtime per week then sum
    const weekStarts = weekStartsInRange(period.periodStart, period.periodEnd)
    const scheduledByProfile = new Map<string, number>()
    const overtimeByProfile  = new Map<string, number>()

    if (period.frequency === 'weekly' || weekStarts.length <= 1) {
      const hoursMap = computeScheduledHours(shifts)
      for (const [pid, total] of hoursMap) {
        const { regular, overtime } = splitOvertimeHours(total)
        scheduledByProfile.set(pid, total)
        overtimeByProfile.set(pid, overtime)
        // store regular implicitly: regular = total - overtime
        void regular
      }
    } else {
      // Biweekly: sum each week's scheduled hours, compute OT per week
      for (const ws of weekStarts) {
        const weekShifts = shifts.filter(s => s.weekStart.toISOString().slice(0, 10) === ws)
        const hoursMap   = computeScheduledHours(weekShifts)
        for (const [pid, total] of hoursMap) {
          const { overtime } = splitOvertimeHours(total)
          scheduledByProfile.set(pid, (scheduledByProfile.get(pid) ?? 0) + total)
          overtimeByProfile.set(pid, (overtimeByProfile.get(pid) ?? 0) + overtime)
        }
      }
    }

    const entryMap = new Map(period.entries.map(e => [e.profileId, e]))

    const rows: PayrollDetailRow[] = profiles.map(profile => {
      const entry          = entryMap.get(profile.id)
      const scheduledHours = Math.round((scheduledByProfile.get(profile.id) ?? 0) * 100) / 100
      const actualHours    = entry?.actualHours != null ? Number(entry.actualHours) : null
      const effectiveHours = actualHours ?? scheduledHours

      // For biweekly with actual hours override, recompute OT from scratch (single week assumption)
      let regularHours: number
      let overtimeHours: number
      if (actualHours != null) {
        const split = splitOvertimeHours(actualHours)
        regularHours  = split.regular
        overtimeHours = split.overtime
      } else {
        overtimeHours = Math.round((overtimeByProfile.get(profile.id) ?? 0) * 100) / 100
        regularHours  = Math.round((effectiveHours - overtimeHours) * 100) / 100
      }

      const rate     = entry?.hourlyRate != null ? Number(entry.hourlyRate) : null
      const grossPay = rate != null
        ? String(computeGrossPay(regularHours, overtimeHours, rate))
        : null

      return {
        profileId:      profile.id,
        profileName:    formatEmployeeName(profile.lastName, profile.firstName, profile.middleName),
        scheduledHours,
        actualHours,
        effectiveHours: Math.round(effectiveHours * 100) / 100,
        regularHours,
        overtimeHours,
        hourlyRate:     entry?.hourlyRate != null ? entry.hourlyRate.toString() : null,
        grossPay,
        note:           entry?.note ?? null,
        entryId:        entry?.id ?? null,
      }
    })

    return {
      success: true,
      data: {
        period: {
          id:          period.id,
          periodStart: period.periodStart.toISOString().slice(0, 10),
          periodEnd:   period.periodEnd.toISOString().slice(0, 10),
          frequency:   period.frequency as 'weekly' | 'biweekly',
          status:      period.status as 'open' | 'closed',
          createdBy:   period.createdBy,
          createdAt:   period.createdAt.toISOString(),
          entryCount:  period._count.entries,
        },
        rows,
      },
    }
  } catch {
    return { success: false, error: 'Failed to load payroll detail.' }
  }
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function createPayrollPeriod(
  _prev: PayrollResult | null,
  formData: FormData,
): Promise<PayrollResult<PeriodRow>> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'owner')) {
    return { success: false, error: 'Owner access required.' }
  }

  const parsed = PeriodSchema.safeParse({
    periodStart: formData.get('periodStart'),
    periodEnd:   formData.get('periodEnd'),
    frequency:   formData.get('frequency'),
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }
  const d = parsed.data

  try {
    const period = await prisma.payrollPeriod.create({
      data: {
        periodStart: new Date(d.periodStart),
        periodEnd:   new Date(d.periodEnd),
        frequency:   d.frequency,
        createdBy:   user.id,
      },
      include: { _count: { select: { entries: true } } },
    })
    revalidatePath('/dashboard/payroll')
    return {
      success: true,
      data: {
        id:          period.id,
        periodStart: period.periodStart.toISOString().slice(0, 10),
        periodEnd:   period.periodEnd.toISOString().slice(0, 10),
        frequency:   period.frequency as 'weekly' | 'biweekly',
        status:      period.status as 'open' | 'closed',
        createdBy:   period.createdBy,
        createdAt:   period.createdAt.toISOString(),
        entryCount:  0,
      },
    }
  } catch {
    return { success: false, error: 'Failed to create pay period.' }
  }
}

export async function closePayrollPeriod(id: string): Promise<PayrollResult> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'owner')) {
    return { success: false, error: 'Owner access required.' }
  }

  try {
    const period = await prisma.payrollPeriod.findUnique({ where: { id } })
    if (!period) return { success: false, error: 'Period not found.' }
    if (period.status === 'closed') return { success: false, error: 'Period is already closed.' }

    await prisma.payrollPeriod.update({ where: { id }, data: { status: 'closed' } })
    revalidatePath('/dashboard/payroll')
    revalidatePath(`/dashboard/payroll/${id}`)
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to close period.' }
  }
}

export async function upsertPayrollEntry(
  periodId: string,
  _prev: PayrollResult | null,
  formData: FormData,
): Promise<PayrollResult> {
  const user = await getAuthUser()
  if (!user || !hasMinimumRole(user.role, 'manager')) {
    return { success: false, error: 'Manager or owner access required.' }
  }

  // Cannot edit a closed period
  const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } })
  if (!period) return { success: false, error: 'Period not found.' }
  if (period.status === 'closed') return { success: false, error: 'This pay period is closed.' }

  const parsed = EntrySchema.safeParse({
    profileId:   formData.get('profileId'),
    actualHours: formData.get('actualHours'),
    hourlyRate:  formData.get('hourlyRate'),
    note:        formData.get('note') || null,
  })
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message }
  }
  const d = parsed.data

  try {
    await prisma.payrollEntry.upsert({
      where: { payrollPeriodId_profileId: { payrollPeriodId: periodId, profileId: d.profileId } },
      create: {
        payrollPeriodId: periodId,
        profileId:       d.profileId,
        actualHours:     d.actualHours ?? null,
        hourlyRate:      d.hourlyRate  ?? null,
        note:            d.note        ?? null,
        createdBy:       user.id,
      },
      update: {
        actualHours: d.actualHours ?? null,
        hourlyRate:  d.hourlyRate  ?? null,
        note:        d.note        ?? null,
      },
    })
    revalidatePath(`/dashboard/payroll/${periodId}`)
    return { success: true, data: undefined }
  } catch {
    return { success: false, error: 'Failed to save entry.' }
  }
}
