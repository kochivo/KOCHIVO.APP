'use client';
import { useT } from '@/core/i18n/client';
import type { PainReportRow } from '@/core/offline/pain-tables';
import { Button } from '@/ui/button';
import { messages } from '../pain/messages';

export function PainAfterSend({ report, exercise, alternative, affected, onContinue, onSwap, onSkip, onStop }: {
  report: PainReportRow; exercise: string; alternative?: string; affected: boolean;
  onContinue: () => void; onSwap: () => void; onSkip: () => void; onStop: () => void;
}) {
  const t = useT(messages);
  const urgent = report.severity === 5 || report.kind === 'sharp';
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
