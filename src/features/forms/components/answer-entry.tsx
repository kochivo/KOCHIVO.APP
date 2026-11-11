'use client';
import dynamic from 'next/dynamic';
import type { Locale } from '@/core/i18n/locale';
import type { RequestData } from '../request-types';
import { LoadingState } from '@/ui/loading-state';
const Flow = dynamic(() => import('./answer-flow').then(m => m.AnswerFlow),{ssr:false,loading:() => <LoadingState variant="detail" />});
export function AnswerEntry({data,locale}:{data:RequestData;locale:Locale}) {
  return <Flow data={data} locale={locale} key={data.request.id} />;
}
