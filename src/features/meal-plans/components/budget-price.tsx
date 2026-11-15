'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../budget/messages';

export function BudgetPrice({ budget, cost }: { budget: number | null; cost: number | null }) {
  const t = useT(messages), locale = useLocale();
  if (!budget || cost === null) return null;
  return <bdi className="rounded-full bg-lime-soft px-stack py-inline text-sm text-lime">{t('money', { n: formatNumber(cost, locale) })}</bdi>;
}
