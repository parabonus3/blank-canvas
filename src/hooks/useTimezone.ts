import { useCallback } from 'react';
import type { Locale } from 'date-fns';
import { useProfile } from '@/hooks/useProfile';
import { formatInTimezone, toTimezone, nowInTimezone } from '@/lib/timezone';
import { useTranslation } from 'react-i18next';
import { getDateLocale } from '@/lib/timezone';

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export function useTimezone() {
  const { data: profile } = useProfile();
  const { i18n } = useTranslation();
  
  const timezone = (profile as any)?.timezone || DEFAULT_TIMEZONE;
  const locale = getDateLocale(i18n.language);

  const formatInTz = useCallback(
    (date: Date | string, formatStr: string, options?: { locale?: Locale }) => {
      return formatInTimezone(date, formatStr, {
        timezone,
        locale: options?.locale || locale,
      });
    },
    [timezone, locale]
  );

  const toTz = useCallback(
    (date: Date | string) => toTimezone(date, timezone),
    [timezone]
  );

  const nowTz = useCallback(
    () => nowInTimezone(timezone),
    [timezone]
  );

  return { timezone, formatInTz, toTz, nowTz, locale };
}
