'use client';
import { useT } from '@/core/i18n/client';
import type { PainReportRow } from '@/core/offline/pain-tables';
import { Button } from '@/ui/button';
import { messages } from '../pain/messages';

export function PainAfterSend({ report, exercise, alternative, onSwap, onSkip }: {
  report: PainReportRow; exercise: string; alternative?: string; onSwap: () => void; onSkip: () => void;
}) {
  const t = useT(messages);
  const urgent = report.severity === 5 || report.kind === 'sharp';
  const note = <p className={`glass-strong rounded-card p-card ${urgent ? 'text-danger' : 'text-muted'}`}>{t('doctor')}</p>;
  return <section className="space-y-card-gap" role="status">
    {urgent && note}
    <div className="glass-strong space-y-stack rounded-card p-card"><h2 className="text-title text-danger">{t('stopped', { exercise })}</h2><p>{t('sent')}</p></div>
    {alternative ? <div className="glass flex items-center justify-between gap-inline rounded-card p-card"><s className="text-muted">{exercise}</s><strong>{alternative}</strong></div>
      : <p className="glass rounded-card p-card">{t('noSwap', { area: t(report.area) })}</p>}
    {!urgent && note}
    {alternative && <Button block onClick={onSwap}>{t('swap')}</Button>}
    <Button block variant="secondary" onClick={onSkip}>{t('skip', { area: t(report.area) })}</Button>
  </section>;
}
