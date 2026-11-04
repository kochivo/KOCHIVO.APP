'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { IconButton, LoadingState } from '@/ui';
import { Deferred } from '@/ui/deferred';
import { messages } from '../messages';
import type { LibraryExercise } from '../types';

const ExercisePicker = dynamic(() => import('./exercise-picker').then(module => module.ExercisePicker), {
  ssr: false, loading: () => <LoadingState />,
});

export function ExerciseDrawer({ openerId, onClose, onAdd, usedExerciseIds }: {
  openerId: string; onClose: () => void; onAdd: (exercise: LibraryExercise) => void;
  usedExerciseIds?: string[];
}) {
  const t = useT(messages);
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const opener = document.activeElement;
    element.showModal();
    element.querySelector<HTMLButtonElement>('button')?.focus();
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      element.animate([{ transform: `translateX(${locale === 'ar' ? '-100%' : '100%'})` }, { transform: 'translateX(0)' }], { duration: 180, easing: 'ease-out' });
    }
    return () => {
      element.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      else document.getElementById(openerId)?.focus();
    };
  }, [locale, openerId]);
  return <dialog ref={dialog} dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-label={t('exerciseLibrary')}
    style={{ maxBlockSize: '100dvh' }}
    className="sheet fixed inset-y-0 end-0 start-auto m-0 h-dvh w-full max-w-md overflow-y-auto p-4 text-ink backdrop:bg-bg-deep/80"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.x || event.clientX > bounds.x + bounds.width || event.clientY < bounds.y || event.clientY > bounds.y + bounds.height) onClose();
    }}>
    <div className="mb-4 flex justify-end">
      <IconButton aria-label={t('closeLibrary')} onClick={onClose}><X aria-hidden className="size-5" /></IconButton>
    </div>
    <Deferred fallback={<LoadingState />}><ExercisePicker disabled={false} usedExerciseIds={usedExerciseIds} onAdd={onAdd} /></Deferred>
  </dialog>;
}
