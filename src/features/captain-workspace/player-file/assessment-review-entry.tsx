'use client';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import type { Locale } from '@/core/i18n/locale';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { FileDisclosureEntry } from './file-disclosure-entry';
import { FileState } from './file-state';
import { messages } from './messages';

function Loading() { return <FileState locale={useLocale()} />; }
const Manager = dynamic(() => import('@/features/forms').then(module => module.RequestManager), { loading: Loading });
export function AssessmentReviewEntry({ playerId, locale, pending }: { playerId: string; locale: Locale; pending: number }) {
  const t = useT(messages);
  const requested = useSearchParams().get('requestId');
  const content = <Manager playerId={playerId} locale={locale} />;
  return <div id="assessment-details" className="col-span-full">
    {requested ? content : <FileDisclosureEntry label={t('assessmentRequests', { count: formatNumber(pending, locale) })}>{content}</FileDisclosureEntry>}
  </div>;
}
