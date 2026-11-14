'use client';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import type { Locale } from '@/core/i18n/locale';
import { useLocale } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { FileDisclosureEntry } from './file-disclosure-entry';
import { FileState } from './file-state';
import { messages } from './messages';

function Loading() { return <FileState locale={useLocale()} />; }
const Manager = dynamic(() => import('@/features/forms').then(module => module.RequestManager), { loading: Loading });
export function AssessmentReviewEntry({ playerId, locale }: { playerId: string; locale: Locale }) {
  const requested = useSearchParams().get('requestId');
  const content = <Manager playerId={playerId} locale={locale} />;
  return <div id="assessment-details" className="col-span-full">
    {requested ? content : <FileDisclosureEntry label={createT(messages, locale)('history')}>{content}</FileDisclosureEntry>}
  </div>;
}
