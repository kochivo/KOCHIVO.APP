import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { StatStrip } from '@/ui/stat-strip';
import { workspaceMessages } from '../messages';
import { messages } from '../workspace/messages';
import type { subscriptionTiles } from './workspace-billing-summary';

export function WorkspaceBillingTiles({ values, owed }: {
  values: Omit<ReturnType<typeof subscriptionTiles>, 'pending'> & { pending: number | null }; owed?: number;
}) {
  const t = useT(workspaceMessages), finance = useT(messages), locale = useLocale();
  const number = (value: number | null) => value === null ? null : formatNumber(value, locale);
  return <StatStrip items={[
    { label: t('income'), value: number(values.income), unit: finance('currency') },
    owed === undefined
      ? { label: t('pending'), value: number(values.pending), tone: 'warn' }
      : { label: finance('owed'), value: number(owed), unit: finance('currency'), tone: 'warn' },
    { label: t('active'), value: number(values.active),
      note: owed !== undefined && values.pending !== null ? `${t('pending')} · ${number(values.pending)}` : undefined },
    { label: t('ending'), value: number(values.ending), tone: 'warn' },
  ]} />;
}
