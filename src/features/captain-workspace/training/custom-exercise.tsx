'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { createContext, useContext, useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import type { LibraryExercise } from '@/features/programs';
import { loadLibraryExercise } from './data/editor-actions';
import { messages } from '../library/messages';
import { buttonClass } from '@/ui/button';

export const CustomExerciseNavigation = createContext<{
  programId: string; dayId: string; flush: () => Promise<boolean>;
} | null>(null);

export function exerciseReturnPath(returnTo?: string): string {
  const fallback = '/captain/library/exercises';
  if (!returnTo || !/^\/(?:ar\/|en\/)?captain\//.test(returnTo) || /[\\\r\n]/.test(returnTo)) return fallback;
  const url = new URL(returnTo, 'https://kochivo.invalid');
  return url.origin === 'https://kochivo.invalid' && /^\/(?:ar\/|en\/)?captain\//.test(url.pathname)
    ? url.pathname + url.search : fallback;
}

export function customExerciseHref(returnTo: string, programId: string, dayId: string, exerciseId?: string) {
  const url = new URL(exerciseReturnPath(returnTo), 'https://kochivo.invalid');
  url.searchParams.delete('customExercise'); url.searchParams.delete('customExerciseMode');
  url.searchParams.set('exerciseProgram', programId); url.searchParams.set('exerciseDay', dayId);
  return `/captain/library/exercises/${exerciseId ? `${encodeURIComponent(exerciseId)}/edit` : 'new'}?${new URLSearchParams({ returnTo: url.pathname + url.search })}`;
}

export async function prepareCustomExerciseNavigation(flush: () => Promise<boolean>, navigate: () => void) {
  if (!await flush()) return false;
  navigate(); return true;
}

export async function completeCustomExerciseReturn(id: string, apply: (row: LibraryExercise) => void, flush: () => Promise<boolean>) {
  const result = await loadLibraryExercise(id);
  if (result.error !== undefined || !result.data?.is_own) throw new Error('exercise');
  apply(result.data);
  return flush();
}

export function CustomExercise({ exercise }: { onAdd?: (row: LibraryExercise) => void; exercise?: LibraryExercise }) {
  const t = useT(messages), context = useContext(CustomExerciseNavigation);
  const pathname = usePathname(), search = useSearchParams(), router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const navigating = useRef(false);
  const href = customExerciseHref(`${pathname}?${search}`, context?.programId ?? '', context?.dayId ?? '', exercise?.id);
  return <div className="px-[18px] pb-3">
    <Link id={`custom-exercise-${exercise?.id ?? 'new'}`} href={href} aria-disabled={busy} aria-busy={busy}
      className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-3 text-xs text-muted" })}
      onClick={event => {
        event.preventDefault(); if (navigating.current) return;
        navigating.current = true; setBusy(true); setError('');
        void (async () => {
          try {
            if (!await prepareCustomExerciseNavigation(context?.flush ?? (async () => true), () => router.push(href))) setError(t('saveError'));
          } catch { setError(t('saveError')); }
          finally { navigating.current = false; setBusy(false); }
        })();
      }}>{t(exercise ? 'edit' : 'custom')}</Link>
    {busy && <p role="status" className="text-sm text-muted">{t('saving')}</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </div>;
}
