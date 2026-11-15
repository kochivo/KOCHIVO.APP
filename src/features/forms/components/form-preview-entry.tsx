'use client';
import dynamic from 'next/dynamic';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import type { FormDraft } from '../types';
import { LoadingState } from '@/ui/loading-state';

const Preview = dynamic(() => import('./form-preview').then(module => module.FormPreview), {
  loading: () => <LoadingState variant="cards" />,
});
export function FormPreviewEntry(props: { form: FormDraft; locale: Locale; style?: ArabicStyle }) {
  return <Preview {...props} />;
}
