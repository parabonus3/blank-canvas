import { format as dateFnsFormat, type Locale } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

/**
 * Convert a Date to a "fake local" Date that represents the time in the given timezone.
 * This allows date-fns format() to display the correct timezone-adjusted values.
 */
export function toTimezone(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find(p => p.type === type)?.value || '0', 10);

  const year = get('year');
  const month = get('month') - 1; // 0-indexed
  const day = get('day');
  let hour = get('hour');
  if (hour === 24) hour = 0; // midnight edge case
  const minute = get('minute');
  const second = get('second');

  return new Date(year, month, day, hour, minute, second);
}

/**
 * Format a date in the user's timezone using date-fns format strings.
 */
export function formatInTimezone(
  date: Date | string,
  formatStr: string,
  options?: { locale?: Locale; timezone?: string }
): string {
  const tz = options?.timezone || DEFAULT_TIMEZONE;
  const adjustedDate = toTimezone(date, tz);
  return dateFnsFormat(adjustedDate, formatStr, { locale: options?.locale });
}

/**
 * Get "now" in the user's timezone as a fake-local Date.
 */
export function nowInTimezone(timezone: string = DEFAULT_TIMEZONE): Date {
  return toTimezone(new Date(), timezone);
}

/**
 * Get all available IANA timezones grouped by region.
 */
export function getGroupedTimezones(): Record<string, string[]> {
  const timezones = (Intl as any).supportedValuesOf('timeZone') as string[];
  const grouped: Record<string, string[]> = {};

  for (const tz of timezones) {
    const slashIndex = tz.indexOf('/');
    const region = slashIndex > -1 ? tz.substring(0, slashIndex) : 'Other';
    if (!grouped[region]) grouped[region] = [];
    grouped[region].push(tz);
  }

  return grouped;
}

/**
 * Get a display label for a timezone, e.g. "America/Sao_Paulo" → "Sao Paulo (UTC-3)"
 */
export function getTimezoneLabel(tz: string): string {
  const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
  
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offset = parts.find(p => p.type === 'timeZoneName')?.value || '';
    return `${city} (${offset})`;
  } catch {
    return city;
  }
}

export function getDateLocale(language: string): Locale {
  if (language.startsWith('pt')) return ptBR;
  if (language.startsWith('es')) return es;
  return enUS;
}
