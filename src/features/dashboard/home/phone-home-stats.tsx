import Link from 'next/link';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import { StatStrip } from '@/ui/stat-strip';
import { phoneHomeMessages } from './phone/messages';
import { homeMessages } from './messages';

export function PhoneHomeStats({ locale, style, adherence, previous, trained, active, paid }: {
  locale: Locale; style?: ArabicStyle; adherence: number; previous: number; trained: number; active: number; paid: number;
}) {
  const t = createT(phoneHomeMessages, locale, style), home = createT(homeMessages, locale, style);
  const number = (value: number) => formatNumber(value, locale);
  const delta = adherence - previous;
  const income = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(paid);
  return <StatStrip className="max-sm:grid-cols-3! md:hidden [&>div]:relative [&>div]:px-stack [&_p>span:first-child]:text-h" items={[
    { label: t('adherence'), value: home('percent', { value: number(adherence) }), tone: 'lime',
      note: <bdi dir="ltr">{delta > 0 ? '+' : ''}{number(delta)}%</bdi> },
    { label: t('trained'), value: number(trained), note: t('total', { count: number(active) }) },
    { label: t('month'), value: <>{income}<Link href="/captain/billing" className="absolute inset-0 min-h-12 rounded-control focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime"
      aria-label={`${t('month')} · ${number(paid)} ${home('currency')}`} /></>, note: home('currency') },
  ]} />;
}
