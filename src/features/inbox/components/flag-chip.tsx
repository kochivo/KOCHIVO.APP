'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import type { TriageFlag } from '../triage';

export function FlagChip({ flag }: { flag: TriageFlag }) {
  const t = useT(messages);
  const locale = useLocale();
  const values = Object.fromEntries(Object.entries(flag.values).map(([key, value]) =>
    [key, formatNumber(Math.round(value * 10) / 10, locale)]));
  return <span className="glass rounded-full px-stack py-inline text-sm text-muted">{t(flag.key, values)}</span>;
}
