import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import { StatStrip } from '@/ui/stat-strip';
import { messages as legacyMessages, workspaceMessages } from '../messages';
import { messages } from '../workspace/messages';
import type { subscriptionTiles } from './workspace-billing-summary';

export function WorkspaceBillingTiles({ values, owed, owing, today, expected, noPackage }: {
  values: Omit<ReturnType<typeof subscriptionTiles>, 'pending'> & { pending: number | null };
  owed?: number; owing?: number; today?: string; expected?: number; noPackage?: number;
}) {
  const t = useT(workspaceMessages), finance = useT(messages), legacy = useT(legacyMessages), locale = useLocale();
  const number = (value: number | null) => value === null ? null : formatNumber(value, locale);
  return <StatStrip className={today ? 'glass-strong' : undefined} items={[
    { label: today ? t('monthIncome', { month: formatDateAr(today, { month: 'long' }, locale) }) : t('income'),
      value: number(values.income), unit: finance('currency'),
      note: expected && expected > 0 ? t('expected', { amount: formatNumber(expected, locale) }) : undefined },
    owed === undefined
      ? { label: t('pending'), value: number(values.pending), tone: 'warn' }
      : { label: finance('owed'), value: number(owed), unit: finance('currency'), tone: owed > 0 ? 'warn' : 'ink',
        note: owing ? legacy('owingPlayers', { n: owing, count: formatNumber(owing, locale) }) : undefined },
    { label: t(today ? 'activeSubscriptions' : 'active'), value: number(values.active),
      note: noPackage ? t('withoutPackages', { count: formatNumber(noPackage, locale) }) : undefined },
    { label: t('ending'), value: number(values.ending), tone: today ? 'ink' : 'warn' },
  ]} />;
}
