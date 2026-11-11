import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import type { PlayerFile } from '@/features/player-file';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { PlayerFileFact } from './player-file-fact';
import { factLabel, factValue, sourceLabel, weekdays } from './player-file-format';

export function PlayerFilePanel({ name, file, locale, initialWeight }: {
  name: string; file: PlayerFile; locale: Locale; initialWeight?: number;
}) {
  const t = createT(messages, locale);
  const { facts, history } = file;
  const current = facts.weight?.value;
  const target = facts.targetWeight?.value;
  const progress = initialWeight !== undefined && current !== undefined && target != null
    ? Math.round(Math.max(0, Math.min(1, target === initialWeight ? (current === target ? 1 : 0)
      : (current - initialWeight) / (target - initialWeight))) * 100) : null;
  return <div className="space-y-5">
    <header className="space-y-3">
      <h1 className="break-words font-display text-2xl font-bold">{name}</h1>
      <PlayerFileFact factKey="targetWeight" fact={facts.targetWeight} locale={locale} />
    </header>
    {!Object.keys(facts).length && <p className="text-sm text-muted">{t('noFacts')}</p>}
    <div className="glass-strong grid grid-cols-3 gap-3 rounded-control p-3">
      {(['weight', 'height', 'age'] as const).map(key => <PlayerFileFact key={key} factKey={key} fact={facts[key]} locale={locale} />)}
    </div>
    <section className="space-y-2" aria-label={t('goalProgress')}>
      <h2 className="text-xs text-muted">{t('goalProgress')}</h2>
      {progress === null ? <p className="text-sm text-muted">{t('unavailable')}</p> : <>
        <div role="progressbar" aria-label={t('goalProgress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}
          className="h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-lime" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between gap-2 text-xs text-muted">
          <bdi dir="ltr">{t('kg', { count: formatNumber(initialWeight ?? 0, locale) })}</bdi>
          <bdi dir="ltr" className="text-ink">{factValue('weight', current, locale)}</bdi>
          <bdi dir="ltr">{factValue('targetWeight', target, locale)}</bdi>
        </div>
      </>}
    </section>
    <PlayerFileFact factKey="trainingDays" fact={facts.trainingDays} locale={locale}>
      <ul className="flex gap-1">{weekdays.map((day, index) => <li key={day}
        aria-label={t('trainingDayLabel', { day: t(day), status: facts.trainingDays ? t(facts.trainingDays.value.includes(index) ? 'trainingDay' : 'rest') : t('unavailable') })}
        className={`flex min-h-9 min-w-0 flex-1 items-center justify-center rounded-control border text-xs ${facts.trainingDays?.value.includes(index) ? 'border-lime/30 bg-lime-soft text-lime' : 'border-line text-muted'}`}>
        {t(day)}</li>)}</ul>
    </PlayerFileFact>
    {(['sessionMinutes', 'injuries', 'medical', 'allergies', 'note'] as const).map(key =>
      <PlayerFileFact key={key} factKey={key} fact={facts[key]} locale={locale} />)}
    <section className="space-y-3">
      <h2 className="font-bold">{t('history')}</h2>
      {history.length ? <ol className="space-y-4">{[...history].sort((a, b) => Date.parse(b.source.at) - Date.parse(a.source.at)).map(entry =>
        <li key={`${entry.source.kind}-${entry.source.id}`} className="space-y-1 text-sm">
          <p>{sourceLabel(entry.source, locale)}</p>
          <p className="text-xs text-muted">{entry.first ? t('firstData') : entry.changed.length
            ? t('changedFacts', { facts: entry.changed.map(key => factLabel(key, locale)).join(' · ') }) : t('unchanged')}</p>
        </li>)}</ol> : <p className="text-sm text-muted">{t('noForms')}</p>}
    </section>
  </div>;
}
