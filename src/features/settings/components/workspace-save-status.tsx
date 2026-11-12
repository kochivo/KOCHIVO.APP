'use client';
import { CloudCheck, LoaderCircle, CircleAlert } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../workspace/messages';
import type { SaveState } from '../instant-save';

export function WorkspaceSaveStatus({ state, error, retry }: { state: SaveState; error?: string; retry: () => void }) {
  const t = useT(messages);
  const Icon = state === 'saving' ? LoaderCircle : state === 'error' ? CircleAlert : CloudCheck;
  return <div role={state === 'error' ? 'alert' : 'status'} aria-live="polite" className={`flex flex-wrap items-center gap-2 text-xs ${state === 'error' ? 'text-danger' : 'text-faint'}`}>
    <Icon aria-hidden className="size-4" />{state === 'error' ? error || t('error') : t(state)}
    {state === 'error' && <button type="button" onClick={retry} className="min-h-12 rounded-full border border-line px-3">{t('retry')}</button>}
  </div>;
}
