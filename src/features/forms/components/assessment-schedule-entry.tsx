'use client';
import dynamic from 'next/dynamic';
import type { Locale } from '@/core/i18n/locale';
import { useLocale } from '@/core/i18n/client';
import { messages } from '../messages';

function Loading() { return <p role="status" className="glass rounded-card p-card">{messages[useLocale()].loading}</p>; }
const Workspace = dynamic(() => import('./assessment-workspace').then(m => m.AssessmentWorkspace), { loading: Loading });
export function AssessmentScheduleEntry(props: { playerId?: string; formId?: string; locale: Locale }) {
  return <Workspace {...props} />;
}
