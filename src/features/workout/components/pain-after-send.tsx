'use client';
import { useLocale, useT } from '@/core/i18n/client';
import type { PainReportRow } from '@/core/offline/pain-tables';
import { Button } from '@/ui/button';
import { messages } from '../pain/messages';
import { messages as v4Messages } from '../v4/messages';
import type { describePainQueue } from '../pain-stop';
import { formatNumber } from '@/lib/format';

export function PainAfterSend({ report, exercise, alternative, affected, onContinue, onSwap, onSkip, onStop, queue }: {
  report: PainReportRow; exercise: string; alternative?: string; affected: boolean;
  onContinue: () => void; onSwap: () => void; onSkip: () => void; onStop: () => void;
  queue?: ReturnType<typeof describePainQueue>;
}) {
  const t = useT(messages);
  const vt = useT(v4Messages);
  const locale = useLocale();
  const urgent = report.severity === 5 || report.kind === 'sharp';
  const safeCount = queue?.filter(row => !row.removed).length ?? 0;
  if (queue) return <section className="mt-card-gap flex min-h-[calc(100dvh-6rem)] flex-col gap-card-gap">
    <div role="status" className={`glass space-y-stack rounded-card p-card ${urgent ? 'border border-danger/30 bg-danger-soft' : ''}`}>
      <p className={urgent ? 'font-bold text-danger' : 'text-sm text-muted'}>{t('doctor')}</p>
      <p className="text-xs text-muted">{t('sent')}</p>
      {!affected && <p className="text-xs text-muted">{t('unaffected', { area: t(report.area) })}</p>}
    </div>
    <section className="glass space-y-stack rounded-card p-card">
      <h3 className="text-sm font-bold">{vt('remaining')}</h3>
      {queue.length ? <ul className="space-y-inline">{queue.map(row => <li key={row.id} className="flex items-center justify-between gap-inline text-row">
        {row.removed ? <s className="text-muted"><bdi>{row.name}</bdi></s> : <bdi>{row.name}</bdi>}
        <span className={`shrink-0 rounded-md px-inline text-micro font-semibold ${row.removed ? 'tone-danger' : 'tone-lime'}`}>{vt(row.removed ? 'removed' : 'safe')}</span>
      </li>)}</ul> : <p className="text-sm text-muted">{vt('noneRemaining')}</p>}
    </section>
    {affected && alternative && <div className="glass flex items-center justify-between gap-inline rounded-card p-card"><s className="text-muted">{exercise}</s><strong>{alternative}</strong></div>}
    {affected && !alternative && !urgent && <p className="text-sm text-muted">{t('noSwap', { area: t(report.area) })}</p>}
    <div className="mt-auto flex flex-col gap-inline">
      {urgent && <Button block size="lg" onClick={onStop}>{t('stopWorkout')}</Button>}
      {!affected && !urgent && <Button block size="lg" onClick={onContinue}>{t('continueWorkout')}</Button>}
      {affected && alternative && <Button block size="lg" variant={urgent ? 'secondary' : 'primary'} onClick={onSwap}>{t('swap')}</Button>}
      <Button block size="lg" variant={urgent || alternative || !affected ? 'secondary' : 'primary'} onClick={onSkip}>
        {affected ? safeCount > 0 ? vt('continueSafe', { count: formatNumber(safeCount, locale) }) :
          t('skip', { area: t(report.area) }) : t('stopAnyway')}
      </Button>
    </div>
  </section>;
  const note = <p className={`glass-strong rounded-card p-card ${urgent ? 'text-danger' : 'text-muted'}`}>{t('doctor')}</p>;
  if (!affected && !urgent) return <section className="space-y-card-gap" role="status">
    <p className="glass-strong rounded-card p-card text-calm">{t('unaffected', { area: t(report.area) })}</p>
    {note}
    <Button block size="lg" onClick={onContinue}>{t('continueWorkout')}</Button>
    <Button block size="lg" variant="secondary" onClick={onSkip}>{t('stopAnyway')}</Button>
  </section>;
  return <section className="space-y-card-gap" role="status">
    {urgent && note}
    <div className="glass-strong space-y-stack rounded-card p-card"><h2 className="text-title text-danger">{t('stopped', { exercise })}</h2><p>{t('sent')}</p></div>
    {alternative ? <div className="glass flex items-center justify-between gap-inline rounded-card p-card"><s className="text-muted">{exercise}</s><strong>{alternative}</strong></div>
      : <p className="glass rounded-card p-card">{t('noSwap', { area: t(report.area) })}</p>}
    {!urgent && note}
    {urgent && <Button block size="lg" onClick={onStop}>{t('stopWorkout')}</Button>}
    {alternative && <Button block size="lg" variant={urgent ? 'secondary' : 'primary'} onClick={onSwap}>{t('swap')}</Button>}
    <Button block size="lg" variant={urgent || alternative ? 'secondary' : 'primary'} onClick={onSkip}>{t('skip', { area: t(report.area) })}</Button>
  </section>;
}
