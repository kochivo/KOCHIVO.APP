import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { ProgressBar } from '@/ui/progress-bar';
import { weightProgress } from './model';
import { messages } from './messages';
import type { FileSummary, Profile } from './types';

export function ProgressSummary({ profile, summary, locale }: { profile: Profile; summary: FileSummary; locale: Locale }) {
  const t = createT(messages, locale);
  const current = summary.file.facts.weight?.value ?? null, target = summary.file.facts.targetWeight?.value ?? null;
  const progress = weightProgress(profile.intake?.weightKg ?? null, current, target);
  const planned = summary.file.facts.trainingDays?.value.length ?? profile.program?.days ?? 0;
  return <section className="glass rounded-card border border-line-soft px-page-x py-page-y">
    <h2 className="mb-stack font-display text-title font-semibold">{t('progress')}</h2>
    <div className="grid grid-cols-2 gap-stack">
      <div className="glass-strong space-y-inline rounded-card border border-line-soft p-card">
        <p className="text-xs text-muted">{t('weight')}</p><p className="font-display text-3xl font-extrabold tabular-nums">{current === null ? t('unavailable') : formatNumber(current, locale)} <small className="text-xs font-normal text-faint">{t('kg')}</small></p>
        {progress !== null && <ProgressBar value={progress} max={100} aria-label={t('weight')} />}
        <p className="text-micro text-faint">{target !== null && current !== null ? t('targetRemaining', { count: formatNumber(Math.round(Math.abs(target - current) * 10) / 10, locale) }) : t('unavailable')}</p>
      </div>
      <div className="glass-strong space-y-inline rounded-card border border-line-soft p-card">
        <p className="text-xs text-muted">{t('adherence')}</p><p className="font-display text-3xl font-extrabold tabular-nums"><bdi>{formatNumber(summary.completedDays, locale)}/{formatNumber(planned, locale)}</bdi> <small className="text-xs font-normal text-faint">{t('thisWeek')}</small></p>
        <ProgressBar value={summary.completedDays} max={planned} aria-label={t('adherence')} />
      </div>
    </div>
  </section>;
}
