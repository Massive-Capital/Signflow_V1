const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export const APP_TIME_ZONE = 'UTC'

type TimeZoneNameStyle = 'short' | 'long'

/** All displayed timestamps use UTC for a consistent international format. */
export function formatTimeZoneLabel(
  _value: string | Date = new Date(),
  style: TimeZoneNameStyle = 'short',
): string {
  if (style === 'long') {
    return '(UTC+00:00) Coordinated Universal Time'
  }
  return '(UTC+00:00) UTC'
}

export function formatDisplayDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'

  const day = date.getUTCDate()
  const month = MONTHS[date.getUTCMonth()]
  const year = date.getUTCFullYear()

  return `${day}-${month}-${year}`
}

export function formatDisplayDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'

  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  const timeZone = formatTimeZoneLabel(date)

  return `${formatDisplayDate(date)}, ${hour12}:${minutes} ${ampm}${timeZone ? ` ${timeZone}` : ''}`
}

/** Normalizes stored field values (e.g. ISO dates) to the app display format. */
export function formatDateFieldValue(value: string): string {
  if (ISO_DATE_ONLY.test(value)) {
    return formatDisplayDate(value)
  }
  return value
}
