'use client';
import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResource } from '@/core/resource';
import { useT, useLocale } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { useToast } from '@/ui/toast';
import { messages } from '../pain/messages';
import { answerPain, loadPainReports } from '../data/pain-reports';

const PainAlert = dynamic(() => import('./pain-alert').then(module => module.PainAlert));
export function PainReportsEntry({ playerId }: { playerId: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const [now] = useState(() => Date.now());
  const read = useCallback((signal: AbortSignal) => loadPainReports(playerId, locale, signal), [playerId, locale]);
  const reports = useResource(`pain-reports:${playerId}:${locale}`, read, { pollMs: 60000 });
  if (reports.status === 'idle' || reports.status === 'loading') return <p role="status" className="p-card text-muted">{t('loading')}</p>;
  if (reports.status === 'error') return <div role="alert"><p>{t('error')}</p><Button variant="secondary" onClick={() => void reports.retry()}>{t('retry')}</Button></div>;
  return <div id="pain-reports" className="space-y-card-gap">
    {!reports.data?.length ? <p className="text-xs text-muted">{t('empty')}</p> : reports.data.map(report => <PainAlert key={report.id} report={report} now={now}
      onAnswer={async reply => {
        await answerPain(report.id, reply);
        toast.success({ title: t('saved'), detail: t('detail'), icon: 'check' });
        await reports.retry();
        if (reply === 'talk') router.push(`/captain/players/${encodeURIComponent(playerId)}/chat`);
      }} />)}
  </div>;
}
