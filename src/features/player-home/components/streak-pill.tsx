'use client';
import { Flame } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import type { StreakStats } from '../streak';

export function StreakPill({ stats, onOpen }: { stats: StreakStats; onOpen: () => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const values = { n: stats.current, count: formatNumber(stats.current, locale), done: formatNumber(stats.weekDone, locale), planned: formatNumber(stats.weekPlanned, locale) };
  return <button id="streak-pill" type="button" onClick={onOpen} aria-haspopup="dialog"
    aria-label={t('streakLabel', values)} className="flex min-h-12 items-center rounded-full text-xs font-medium">
    <span className="inline-flex min-h-[26px] items-center gap-inline rounded-full border border-ink/10 bg-ink/5 px-stack py-inline">
      <Flame aria-hidden="true" size={12} className="text-ember" />
      <span className="text-ember">{stats.current === 0 ? t('streakStart') : t('streakDays', values)}</span>
      <span aria-hidden="true" className="h-3 w-px bg-ink/10" />
      <span className="text-muted">{t('streakWeek', values)}</span>
    </span>
  </button>;
}
