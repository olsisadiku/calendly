import { addMonths, format, parseISO } from 'date-fns'

export interface BillingPeriod {
  start: Date
  end: Date
  label: string
}

/**
 * Calculate billing periods anchored to the matched_at date.
 * Each period is one calendar month starting from the match day.
 */
export function getBillingPeriod(matchedAt: string | Date, targetDate: Date = new Date()): BillingPeriod {
  const anchor = typeof matchedAt === 'string' ? parseISO(matchedAt) : matchedAt
  let periodStart = new Date(anchor)
  periodStart.setHours(0, 0, 0, 0)

  // Walk forward through months until we find the period containing targetDate
  while (addMonths(periodStart, 1) <= targetDate) {
    periodStart = addMonths(periodStart, 1)
  }

  const periodEnd = addMonths(periodStart, 1)

  return {
    start: periodStart,
    end: periodEnd,
    label: `${format(periodStart, 'MMM d')} – ${format(periodEnd, 'MMM d, yyyy')}`,
  }
}

/**
 * Get all billing periods from matchedAt to now.
 */
export function getAllBillingPeriods(matchedAt: string | Date): BillingPeriod[] {
  const anchor = typeof matchedAt === 'string' ? parseISO(matchedAt) : matchedAt
  const now = new Date()
  const periods: BillingPeriod[] = []

  let periodStart = new Date(anchor)
  periodStart.setHours(0, 0, 0, 0)

  while (periodStart < now) {
    const periodEnd = addMonths(periodStart, 1)
    periods.push({
      start: new Date(periodStart),
      end: periodEnd,
      label: `${format(periodStart, 'MMM d')} – ${format(periodEnd, 'MMM d, yyyy')}`,
    })
    periodStart = periodEnd
  }

  return periods
}
