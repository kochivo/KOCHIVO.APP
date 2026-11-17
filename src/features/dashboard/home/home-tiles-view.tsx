import type { Locale } from '@/core/i18n/locale';
import type { Translator } from '@/core/i18n/messages';
import Link from 'next/link';
import { formatNumber } from '@/lib/format';
import { StatStrip } from '@/ui/stat-strip';
import type { homeMessages, homeV11Messages } from './messages';

export function HomeTilesView({ t, locale, onSelect, old, adherence, previous, trained, active, pending, paid, progress, incomeGoal }: {
  t: Translator<typeof homeV11Messages>; locale: Locale; onSelect?: (href: string) => void; old: Translator<typeof homeMessages>;
  adherence: number; previous: number; trained: number; active: number; pending: number; paid: number; progress: number;
  incomeGoal?: number | null; responsiveTo?: 'viewport' | 'container';
}) {
  const number = (value: number) => formatNumber(value, locale);
  const delta = adherence - previous;
  const linked = (href: string, value: string) => <Link href={onSelect ? `#${href}` : href}
    prefetch={onSelect ? false : undefined} className="inline-flex min-h-12 items-center hover:text-lime"
    onClick={onSelect ? event => { event.preventDefault(); onSelect(href); } : undefined}>{value}</Link>;
  return <div data-home-tiles><StatStrip items={[
    { label: old('adherence'), value: old('percent', { value: number(adherence) }), percent: adherence, tone: 'lime',
      delta: `${delta > 0 ? '+' : ''}${number(delta)}%` },
    { label: t('waitingTasks'), value: linked('/captain/tasks', number(pending)), percent: (1 - progress) * 100, tone: 'warn' },
    { label: t('revenue'), value: linked('/captain/billing', number(paid)),
      percent: incomeGoal && incomeGoal > 0 ? paid / incomeGoal * 100 : undefined },
    { label: old('active'), value: number(active), note: `${t('trained')} · ${number(trained)}/${number(active)}`,
      percent: active ? trained / active * 100 : 0 },
  ]} /></div>;
}

