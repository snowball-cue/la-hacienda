/**
 * Payroll calculation utilities.
 *
 * Texas follows FLSA: overtime threshold is 40 hours per workweek (not per day).
 * For bi-weekly pay periods, overtime is computed per-week independently.
 */

/** Parses "HH:MM" and returns decimal hours for a shift. */
export function shiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const minutes = eh * 60 + em - (sh * 60 + sm)
  return Math.round(minutes * 100 / 60) / 100  // 2 decimal places
}

/**
 * Aggregates scheduled hours per profileId from a list of shift rows.
 * Returns a Map<profileId, totalHours>.
 */
export function computeScheduledHours(
  shifts: Array<{ profileId: string; startTime: string; endTime: string }>,
): Map<string, number> {
  const map = new Map<string, number>()
  for (const shift of shifts) {
    const hours = shiftHours(shift.startTime, shift.endTime)
    map.set(shift.profileId, (map.get(shift.profileId) ?? 0) + hours)
  }
  // Round to 2 decimal places
  for (const [k, v] of map) {
    map.set(k, Math.round(v * 100) / 100)
  }
  return map
}

/**
 * Splits total hours into regular and overtime components.
 * FLSA rule: overtime = hours over 40 in a single workweek.
 * For weekly periods: straightforward.
 * For bi-weekly periods: caller must pass each week's total separately.
 */
export function splitOvertimeHours(totalHours: number): { regular: number; overtime: number } {
  const regular  = Math.min(totalHours, 40)
  const overtime = Math.max(totalHours - 40, 0)
  return {
    regular:  Math.round(regular  * 100) / 100,
    overtime: Math.round(overtime * 100) / 100,
  }
}

/**
 * Computes gross pay from hours breakdown and hourly rate.
 * Overtime rate is 1.5× the regular rate (FLSA minimum).
 */
export function computeGrossPay(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number,
): number {
  const gross = regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5
  return Math.round(gross * 100) / 100
}

/** Formats a decimal number as a currency string: "1,234.56" */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Parses a date range and returns an array of Monday dates (as "YYYY-MM-DD") within it. */
export function weekStartsInRange(periodStart: Date, periodEnd: Date): string[] {
  const weeks: string[] = []
  const d = new Date(periodStart)
  // Advance to first Monday
  const dow = d.getUTCDay()
  if (dow !== 1) {
    d.setUTCDate(d.getUTCDate() + ((8 - dow) % 7))
  }
  while (d <= periodEnd) {
    weeks.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 7)
  }
  return weeks
}
