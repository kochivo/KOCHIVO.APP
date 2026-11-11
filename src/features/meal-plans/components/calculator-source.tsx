'use client';
import { useTimezone } from '@/core/timezone/client';

import type { FormSource } from '@/features/player-file';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from './calculator/messages';

export function CalculatorSource({ source, local = false }: { source?: FormSource; local?: boolean }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const locale = useLocale();
  const date = source ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: timezone }).format(new Date(source.at)) : '';
  return <span className="text-sm text-muted">{source
    ? `${t(source.kind === 'intake' ? 'intake' : source.kind === 'checkin' ? 'checkin' : 'otherForm')} · ${date}`
    : t(local ? 'local' : 'missing')}</span>;
}
