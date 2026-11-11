'use client';

import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../messages';

export function PlayerFileSheet({ locale, summary, children }: {
  locale: Locale; summary: ReactNode; children: ReactNode;
}) {
  const t = createT(messages, locale);
  const [open, setOpen] = useState(false);
  const id = useId();
  return <>
    <button id={id} type="button" aria-label={t('playerFile')} aria-describedby={`${id}-summary`} aria-haspopup="dialog" aria-expanded={open}
      onClick={() => setOpen(true)} className="glass-strong min-h-12 w-full rounded-control p-3 text-start">
      <span id={`${id}-summary`}>{summary}</span>
    </button>
    {open && <ResponsiveDialog modal openerId={id} fallbackId={id} onDismiss={() => setOpen(false)}
      aria-labelledby={`${id}-title`} dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card p-6 text-ink">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={`${id}-title`} className="text-xl font-bold">{t('playerFile')}</h2>
        <button type="button" aria-label={t('closeFile')} onClick={() => setOpen(false)}
          className="grid min-h-12 min-w-12 place-items-center rounded-control border border-line">
          <X aria-hidden strokeWidth={1.5} className="size-5" />
        </button>
      </div>
      {children}
    </ResponsiveDialog>}
  </>;
}
