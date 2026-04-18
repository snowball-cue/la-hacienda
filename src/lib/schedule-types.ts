/**
 * Shared types for the Schedule feature.
 * Mirrors the Schedule Prisma model with serialized strings for client safety.
 */

// ── Shift type ────────────────────────────────────────────────────────────────

export type ShiftType = 'work' | 'day_off' | 'vacation' | 'sick' | 'holiday'

export const SHIFT_TYPE_LABELS: Record<ShiftType, string> = {
  work:     'Work',
  day_off:  'Day Off',
  vacation: 'Vacation',
  sick:     'Sick',
  holiday:  'Holiday',
}

export function shiftTypeStyle(type: ShiftType): {
  bg: string; border: string; text: string
} {
  switch (type) {
    case 'work':
      return { bg: 'bg-white',       border: 'border-stone-200',   text: 'text-stone-800' }
    case 'day_off':
      return { bg: 'bg-stone-50',    border: 'border-stone-300',   text: 'text-stone-500' }
    case 'vacation':
      return { bg: 'bg-sky-50',      border: 'border-sky-200',     text: 'text-sky-700'   }
    case 'sick':
      return { bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700' }
    case 'holiday':
      return { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700' }
  }
}

// ── ShiftRow ──────────────────────────────────────────────────────────────────

export interface ShiftRow {
  id:          string
  profileId:   string
  profileName: string   // joined from profiles.full_name at query time
  weekStart:   string   // "YYYY-MM-DD"
  dayOfWeek:   number   // 0 = Monday, 6 = Sunday
  shiftType:   ShiftType
  startTime:   string   // "HH:MM" 24-hour
  endTime:     string   // "HH:MM" 24-hour
  position:    string | null
  note:        string | null
  storeId:     string | null
  storeName:   string | null
  createdBy:   string
  createdAt:   string
  updatedAt:   string

  // Display / worker fields — populated by buildShiftRow in actions/schedule.ts
  workerName:  string         // display name (same as profileName for now)
  workerEmail: string | null  // null — email lives in Supabase Auth, not Prisma
  workerPhone: string | null  // from profiles.phone
  isEmployee:  boolean        // false — all workers are profiles (auth users)
  employeeId:  string | null  // null — no separate Employee model yet
}

/** Groups shifts by day-of-week index. */
export type WeekShifts = Map<number, ShiftRow[]>

// ── Time-off types ────────────────────────────────────────────────────────────

export type TimeOffType   = 'vacation' | 'sick' | 'personal' | 'holiday'
export type TimeOffStatus = 'pending'  | 'approved' | 'denied'

export const TIME_OFF_TYPE_LABELS: Record<TimeOffType, string> = {
  vacation: 'Vacation',
  sick:     'Sick Leave',
  personal: 'Personal',
  holiday:  'Holiday',
}

export const TIME_OFF_STATUS_LABELS: Record<TimeOffStatus, string> = {
  pending:  'Pending',
  approved: 'Approved',
  denied:   'Denied',
}

export interface TimeOffRow {
  id:          string
  profileId:   string
  profileName: string
  type:        TimeOffType
  status:      TimeOffStatus
  dateStart:   string   // "YYYY-MM-DD"
  dateEnd:     string   // "YYYY-MM-DD"
  totalDays:   number
  note:        string | null
  approvedBy:  string | null
  approvedAt:  string | null
  createdAt:   string
}

/**
 * Returns the number of calendar days (inclusive) between two YYYY-MM-DD strings.
 * e.g. "2026-04-07" to "2026-04-09" → 3
 */
export function calendarDays(dateStart: string, dateEnd: string): number {
  const ms = new Date(dateEnd).getTime() - new Date(dateStart).getTime()
  return Math.round(ms / 86_400_000) + 1
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/**
 * Formats "HH:MM" (24-hour) to "H:MM AM/PM" for display.
 * E.g. "08:00" → "8:00 AM", "13:30" → "1:30 PM"
 */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour   = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

/**
 * Compact time format for narrow schedule cards.
 * "08:00" → "8am", "08:30" → "8:30am", "13:00" → "1pm"
 */
export function formatTimeShort(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const hour   = h % 12 || 12
  return m === 0 ? `${hour}${period}` : `${hour}:${String(m).padStart(2, '0')}${period}`
}

/**
 * Calculates the duration of a shift in decimal hours.
 * E.g. "08:00" to "16:30" → 8.5
 */
export function shiftDurationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return (eh * 60 + em - (sh * 60 + sm)) / 60
}
