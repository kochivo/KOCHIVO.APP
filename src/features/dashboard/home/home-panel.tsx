'use client';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { homeMessages } from './messages';

export function HomePanel({ title, openerId, onClose, children }: {
  title: string; openerId: string; onClose: () => void; children: ReactNode;
}) {
  const t = useT(homeMessages);
  return <ResponsiveDialog modal openerId={openerId} fallbackId={openerId} onDismiss={onClose} aria-label={title}
    className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-card border border-line p-5 text-ink backdrop:bg-bg-deep/80">
    <header className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-[19px] font-semibold">{title}</h2>
      <button type="button" onClick={onClose} aria-label={t('close')} className="grid size-12 shrink-0 place-items-center rounded-full border border-line"><X aria-hidden className="size-5" /></button>
    </header>
    <div className="space-y-4">{children}</div>
  </ResponsiveDialog>;
}
