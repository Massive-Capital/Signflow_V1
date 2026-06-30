const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

type TimeZoneNameStyle = 'short' | 'long';

export const APP_TIME_ZONE = 'UTC';

/** All displayed timestamps use UTC for a consistent international format. */
export function formatTimeZoneLabel(
  _value: Date = new Date(),
  style: TimeZoneNameStyle = 'short',
): string {
  if (style === 'long') {
    return '(UTC+00:00) Coordinated Universal Time';
  }
  return '(UTC+00:00) UTC';
}

export function formatAppTimeZone(): string {
  return 'Coordinated Universal Time (UTC)';
}

export function formatSigningDate(value: Date): string {
  const day = value.getUTCDate();
  const month = MONTHS[value.getUTCMonth()];
  const year = value.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

function formatSigningClock(value: Date): string {
  const hours = value.getUTCHours();
  const minutes = value.getUTCMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function formatSigningTimestamp(value: Date): string {
  return `${formatSigningDate(value)}, ${formatSigningClock(value)} ${formatTimeZoneLabel(value)}`;
}

/** Certificate of Completion timestamps include a long UTC timezone label. */
export function splitCertificateTimestamp(value?: string | Date): {
  dateTime: string;
  timeZone: string;
} {
  if (!value) return { dateTime: '—', timeZone: '' };
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { dateTime: '—', timeZone: '' };
  return {
    dateTime: `${formatSigningDate(date)}, ${formatSigningClock(date)}`,
    timeZone: formatTimeZoneLabel(date, 'long'),
  };
}

export function formatCertificateTimestamp(value: Date): string {
  const { dateTime, timeZone } = splitCertificateTimestamp(value);
  return `${dateTime} ${timeZone}`;
}

export function formatCertificateTimestampValue(value?: string | Date): string {
  const { dateTime, timeZone } = splitCertificateTimestamp(value);
  if (dateTime === '—') return '—';
  return timeZone ? `${dateTime} ${timeZone}` : dateTime;
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}[T\s]/;

export function formatSigningDateValue(value: string | Date): string {
  if (typeof value === 'string' && (ISO_DATE_ONLY.test(value) || ISO_DATE_TIME.test(value))) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return formatSigningDate(date);
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatSigningDate(value);
  }
  if (typeof value === 'string') return value;
  return '—';
}
