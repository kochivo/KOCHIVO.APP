'use client';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { homeMessages } from './messages';
import { Button } from '@/ui/button';

export function HomePanel({ title, openerId, onClose, children }: {
  title: string; openerId: string; onClose: () => void; children: ReactNode;
}) {
  const t = useT(homeMessages);
  return <ResponsiveDialog modal openerId={openerId} fallbackId={openerId} onDismiss={onClose} aria-label={title}
    className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-card border border-line p-card text-ink backdrop:bg-bg-deep/80">
    <header className="mb-card-gap flex items-center justify-between gap-stack">
      <h2 className="font-display text-title font-semibold">{title}</h2>
      <Button type="button" onClick={onClose} aria-label={t('close')} variant={'secondary'} block={false} className={"grid size-12 shrink-0 place-items-center"}><X aria-hidden className="size-5" /></Button>
    </header>
    <div className="space-y-card-gap">{children}</div>
  </ResponsiveDialog>;
}
