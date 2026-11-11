'use client';
import dynamic from 'next/dynamic';
import type { Locale } from '@/core/i18n/locale';
import { LoadingState } from '@/ui/loading-state';
const Card = dynamic(() => import('./pending-forms').then(m => m.PendingForms),{loading:() => <LoadingState variant="cards" />});
export function PendingFormsEntry({locale}:{locale:Locale}) { return <Card locale={locale} />; }
