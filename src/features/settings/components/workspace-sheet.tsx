'use client';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../workspace/messages';
import { Button } from '@/ui/button';

export function WorkspaceSheet({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const t = useT(messages);
  return <ResponsiveDialog modal fallbackId="settings-heading" onDismiss={onClose} aria-labelledby="settings-sheet-title"
    className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line bg-surface p-5 text-ink backdrop:bg-bg-deep/80 sm:inset-0 sm:m-auto sm:max-w-2xl sm:rounded-card">
    <header className="mb-4 flex items-center justify-between gap-3"><h2 id="settings-sheet-title" className="font-display text-[19px] font-semibold">{title}</h2>
      <Button type="button" onClick={onClose} aria-label={t('close')} variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center"}><X aria-hidden className="size-5" /></Button></header>
    {children}
  </ResponsiveDialog>;
}
