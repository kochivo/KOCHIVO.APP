'use client';

import { useEffect, useRef } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { messages } from '../messages';

export function RestConfirmation({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    return () => { element?.close(); if (opener instanceof HTMLElement && opener.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={dialog} aria-label={t('clearForRest')} dir={locale === 'ar' ? 'rtl' : 'ltr'}
    className="sheet m-auto max-w-md space-y-card-gap rounded-card p-card text-ink backdrop:bg-bg-deep/80"
    onCancel={event => { event.preventDefault(); onCancel(); }}>
    <p>{t('clearForRest')}</p>
    <div className="flex flex-wrap gap-stack">
      <Button variant="ghost" className="min-h-12" autoFocus onClick={onCancel}>{t('cancelRest')}</Button>
      <Button variant="secondary" className="min-h-12" onClick={onConfirm}>{t('confirmRest')}</Button>
    </div>
  </dialog>;
}
