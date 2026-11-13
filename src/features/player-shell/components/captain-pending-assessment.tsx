'use client';
import { useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ClipboardList } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { localDb } from '@/core/offline';
import { ErrorState, LoadingState } from '@/ui';
import { loadCaptainAssessment } from '../data/captain-assessment';
import { oldestAssessment } from '../captain-v3';
import { messages } from '../captain-messages';
import { chatMessages } from '@/features/chat';

export function CaptainPendingAssessment() {
  const t = useT(messages);
  const chatT = useT(chatMessages);
  const locale = useLocale();
  const load = useCallback(() => loadCaptainAssessment(), []);
  const result = useResource(`captain-assessment:${localDb().userId}`, load);
  if (result.status === 'error') return <ErrorState message={t('failed')} retryLabel={t('retry')} onRetry={() => void result.retry()} />;
  if (!result.data) return <LoadingState variant="detail" />;
  const request = oldestAssessment(result.data);
  if (!request) return null;
  return <Link href={`/${locale}/player/assessments`} prefetch={false}
    title={request.questionCount === null ? undefined : t('estimated', { n: request.questionCount, min: Math.max(1, Math.ceil(request.questionCount / 3)) })}
    className="flex min-h-16 items-center gap-3 rounded-[22px] border border-gold-2/45 bg-gold-2/10 px-3.5 py-3 text-ink">
    <ClipboardList aria-hidden className="size-6 shrink-0 text-gold-2" />
    <span className="flex min-w-0 flex-1 flex-col gap-0.5"><b className="text-sm">{chatT('pending')}</b>
      <span className="text-xs text-muted">{chatT('assessments')}</span></span>
    <ChevronLeft aria-hidden className="dir-icon size-[18px] shrink-0 text-muted" />
  </Link>;
}
