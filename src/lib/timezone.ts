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
 * Returns the timezone offset (in minutes) for a given UTC instant in the given IANA timezone.
 * Positive when timezone is ahead of UTC.
 */
function getTimezoneOffsetMinutes(date: Date, timezone: string): number {
  const tzDate = toTimezone(date, timezone); // fake-local representation
  // tzDate.getTime() is interpreted as local browser time; difference vs real UTC instant gives offset
  const utcAsLocal = new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  );
  return Math.round((tzDate.getTime() - utcAsLocal.getTime()) / 60000);
}

/**
 * Build a real UTC Date from Y/M/D/h/m/s expressed in the given IANA timezone.
 */
function utcFromTzWallClock(
  year: number,
  month0: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timezone: string
): Date {
  // First guess: treat wall-clock as UTC, then adjust by tz offset at that approximate instant
  const guess = new Date(Date.UTC(year, month0, day, hour, minute, second));
  const offsetMin = getTimezoneOffsetMinutes(guess, timezone);
  return new Date(guess.getTime() - offsetMin * 60000);
}

/**
 * Returns the UTC instant that corresponds to 00:00:00 of the given date, in the user's timezone.
 */
export function startOfDayInTz(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const local = toTimezone(date, timezone);
  return utcFromTzWallClock(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    0, 0, 0,
    timezone
  );
}

/**
 * Returns the UTC instant for 23:59:59.999 of the given date, in the user's timezone.
 */
export function endOfDayInTz(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const local = toTimezone(date, timezone);
  const start = utcFromTzWallClock(
    local.getFullYear(),
    local.getMonth(),
    local.getDate() + 1,
    0, 0, 0,
    timezone
  );
  return new Date(start.getTime() - 1);
}

/**
 * Returns the UTC instant that corresponds to the start of the week (Monday 00:00) in the user's timezone.
 */
export function startOfWeekInTz(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const local = toTimezone(date, timezone);
  // local.getDay(): 0=Sun..6=Sat. We want Monday as start of week.
  const dayIdx = local.getDay();
  const diff = dayIdx === 0 ? 6 : dayIdx - 1;
  return utcFromTzWallClock(
    local.getFullYear(),
    local.getMonth(),
    local.getDate() - diff,
    0, 0, 0,
    timezone
  );
}

/**
 * Returns the UTC instant for the first day of the month at 00:00 in the user's timezone.
 */
export function startOfMonthInTz(date: Date | string, timezone: string = DEFAULT_TIMEZONE): Date {
  const local = toTimezone(date, timezone);
  return utcFromTzWallClock(
    local.getFullYear(),
    local.getMonth(),
    1,
    0, 0, 0,
    timezone
  );
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
