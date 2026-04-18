/**
 * Week utilities for the schedule feature.
 * All week navigation is based on Monday as the first day of the week.
 * Dates are stored and passed as "YYYY-MM-DD" strings (no timezone math needed —
 * the store is always in Austin, TX).
 */

export const DAY_NAMES = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
] as const

export type DayName = typeof DAY_NAMES[number]

/**
 * Returns the Monday of the week containing `date`, as "YYYY-MM-DD".
 * If date is a Monday it returns that date unchanged.
 */
export function getMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun, 1=Mon … 6=Sat
  const diff = day === 0 ? -6 : 1 - day  // shift Sunday back 6, others forward to Monday
  d.setDate(d.getDate() + diff)
  return formatDate(d)
}

/** Returns the Monday of the current week. */
export function currentWeekStart(): string {
  return getMonday(new Date())
}

/**
 * Adds `n` weeks (positive or negative) to a "YYYY-MM-DD" weekStart string.
 * Returns the resulting date as "YYYY-MM-DD".
 */
export function addWeeks(weekStart: string, n: number): string {
  const d = parseDate(weekStart)
  d.setDate(d.getDate() + n * 7)
  return formatDate(d)
}

/**
 * Returns the date of a specific day within a week.
 * dayOfWeek: 0 = Monday, 6 = Sunday
 */
export function getDayDate(weekStart: string, dayOfWeek: number): string {
  const d = parseDate(weekStart)
  d.setDate(d.getDate() + dayOfWeek)
  return formatDate(d)
}

/**
 * Formats a week range for display: "Apr 7 – Apr 13, 2025"
 */
export function formatWeekRange(weekStart: string): string {
  const start = parseDate(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' }
  const optsYear: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }

  if (start.getMonth() === end.getMonth()) {
    // "Apr 7 – 13, 2025"
    const startStr = start.toLocaleDateString('en-US', opts)
    const endStr   = end.toLocaleDateString('en-US', optsYear)
    return `${startStr} – ${endStr}`
  }
  // "Mar 31 – Apr 6, 2025"
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', optsYear)}`
}

/**
 * Formats a single date as "Mon, Apr 7"
 */
export function formatShortDate(dateStr: string): string {
  const d = parseDate(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}

/** Parses a "YYYY-MM-DD" string to a UTC Date. */
function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Formats a Date as "YYYY-MM-DD" using its UTC values. */
function formatDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Validates that a string is a valid "YYYY-MM-DD" date and is a Monday.
 * Returns the string unchanged if valid, or falls back to current week's Monday.
 */
export function sanitizeWeekParam(param: string | undefined): string {
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) {
    return currentWeekStart()
  }
  try {
    const d = parseDate(param)
    // Verify it's a Monday (UTC day 1)
    if (d.getUTCDay() !== 1) return currentWeekStart()
    return param
  } catch {
    return currentWeekStart()
  }
}
