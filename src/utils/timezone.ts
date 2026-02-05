/**
 * Timezone utilities for converting times between IANA timezones.
 * All DB times are stored in the teacher's timezone.
 * Conversion happens at the UI boundary.
 */

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

/**
 * Convert a specific time on a specific date between timezones.
 * Handles day shifts when conversion crosses midnight.
 */
export function convertTime(
  time: string,
  dateStr: string,
  fromTZ: string,
  toTZ: string,
): { time: string; dateStr: string; dayOfWeek: number } {
  if (fromTZ === toTZ) {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    return { time, dateStr, dayOfWeek: date.getDay() }
  }

  // Parse time "HH:MM" and date "YYYY-MM-DD"
  const [hours, minutes] = time.split(':').map(Number)
  const [year, month, day] = dateStr.split('-').map(Number)

  // Create a naive UTC date with the given components
  const naiveUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))

  // Find offset between naive UTC and actual time in fromTZ
  const fromParts = getDateParts(naiveUTC, fromTZ)
  const fromAsUTC = Date.UTC(
    fromParts.year,
    fromParts.month - 1,
    fromParts.day,
    fromParts.hour,
    fromParts.minute,
  )

  // The difference tells us how far off naiveUTC is from the intended instant
  const offsetMs = naiveUTC.getTime() - fromAsUTC
  const correctUTC = new Date(naiveUTC.getTime() + offsetMs)

  // Now format this correct UTC instant in the target timezone
  const toParts = getDateParts(correctUTC, toTZ)

  const hh = String(toParts.hour).padStart(2, '0')
  const mm = String(toParts.minute).padStart(2, '0')
  const yy = String(toParts.year)
  const mo = String(toParts.month).padStart(2, '0')
  const dd = String(toParts.day).padStart(2, '0')

  const resultDate = new Date(toParts.year, toParts.month - 1, toParts.day)

  return {
    time: `${hh}:${mm}`,
    dateStr: `${yy}-${mo}-${dd}`,
    dayOfWeek: resultDate.getDay(),
  }
}

function getDateParts(date: Date, tz: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const get = (type: string) => {
    const val = parts.find((p) => p.type === type)?.value ?? '0'
    return parseInt(val, 10)
  }

  // hour12:false can produce hour=24 for midnight in some browsers
  let hour = get('hour')
  if (hour === 24) hour = 0

  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour,
    minute: get('minute'),
  }
}

/**
 * Convert a recurring schedule's day-of-week + time between timezones.
 * Uses a reference date (2025-01-05 = Sunday, so Sunday + dayOfWeek gives the right day).
 */
export function convertDayAndTime(
  dayOfWeek: number,
  time: string,
  fromTZ: string,
  toTZ: string,
): { dayOfWeek: number; time: string } {
  if (fromTZ === toTZ) return { dayOfWeek, time }

  // 2025-01-05 is a Sunday (dayOfWeek 0)
  const refDay = 5 + dayOfWeek
  const refDateStr = `2025-01-${String(refDay).padStart(2, '0')}`

  const result = convertTime(time, refDateStr, fromTZ, toTZ)
  return { dayOfWeek: result.dayOfWeek, time: result.time }
}

/**
 * Get all IANA timezone identifiers supported by the browser.
 */
export function getSupportedTimezones(): string[] {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    // Fallback for older browsers
    return [
      'Africa/Cairo', 'Africa/Johannesburg', 'Africa/Lagos', 'Africa/Nairobi',
      'America/Anchorage', 'America/Argentina/Buenos_Aires', 'America/Bogota',
      'America/Chicago', 'America/Denver', 'America/Halifax', 'America/Lima',
      'America/Los_Angeles', 'America/Mexico_City', 'America/New_York',
      'America/Phoenix', 'America/Santiago', 'America/Sao_Paulo', 'America/Toronto',
      'America/Vancouver', 'Asia/Baghdad', 'Asia/Bangkok', 'Asia/Colombo',
      'Asia/Dhaka', 'Asia/Dubai', 'Asia/Hong_Kong', 'Asia/Istanbul',
      'Asia/Jakarta', 'Asia/Karachi', 'Asia/Kolkata', 'Asia/Kuala_Lumpur',
      'Asia/Manila', 'Asia/Riyadh', 'Asia/Seoul', 'Asia/Shanghai',
      'Asia/Singapore', 'Asia/Taipei', 'Asia/Tehran', 'Asia/Tokyo',
      'Atlantic/Reykjavik', 'Australia/Melbourne', 'Australia/Perth',
      'Australia/Sydney', 'Europe/Amsterdam', 'Europe/Athens', 'Europe/Berlin',
      'Europe/Brussels', 'Europe/Bucharest', 'Europe/Dublin', 'Europe/Helsinki',
      'Europe/Istanbul', 'Europe/Kiev', 'Europe/Lisbon', 'Europe/London',
      'Europe/Madrid', 'Europe/Moscow', 'Europe/Oslo', 'Europe/Paris',
      'Europe/Prague', 'Europe/Rome', 'Europe/Stockholm', 'Europe/Vienna',
      'Europe/Warsaw', 'Europe/Zurich', 'Pacific/Auckland', 'Pacific/Fiji',
      'Pacific/Honolulu', 'UTC',
    ]
  }
}

/**
 * Format a timezone identifier as a human-readable label.
 * e.g. "America/Chicago" → "America/Chicago (CST, UTC-6)"
 */
export function formatTimezoneLabel(tz: string): string {
  try {
    const now = new Date()
    const short = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'short',
    })
      .formatToParts(now)
      .find((p) => p.type === 'timeZoneName')?.value ?? ''

    const long = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'longOffset',
    })
      .formatToParts(now)
      .find((p) => p.type === 'timeZoneName')?.value ?? ''

    // long is like "GMT-06:00", simplify to "UTC-6"
    const utcMatch = long.match(/GMT([+-])(\d{2}):(\d{2})/)
    let utcLabel = long
    if (utcMatch) {
      const sign = utcMatch[1]
      const h = parseInt(utcMatch[2], 10)
      const m = parseInt(utcMatch[3], 10)
      utcLabel = m > 0 ? `UTC${sign}${h}:${String(m).padStart(2, '0')}` : `UTC${sign}${h}`
      if (h === 0 && m === 0) utcLabel = 'UTC'
    }

    return short ? `${tz} (${short}, ${utcLabel})` : `${tz} (${utcLabel})`
  } catch {
    return tz
  }
}
