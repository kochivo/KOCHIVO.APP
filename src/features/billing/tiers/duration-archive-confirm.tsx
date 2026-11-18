'use client';
import { Check } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from './messages';

export function DurationArchiveConfirm({ name, busy, error, onCancel, onConfirm }: {
  name: string; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void;
}) {
  const t = useT(messages);
  return <ResponsiveDialog modal role="alertdialog" aria-modal="true" aria-labelledby="duration-archive-title"
    aria-describedby="duration-archive-detail" aria-busy={busy} fallbackId="catalog-heading" onDismiss={onCancel}
    className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg space-y-card-gap overflow-y-auto rounded-card border border-line bg-surface p-card text-ink backdrop:bg-bg-deep/80">
    <h2 id="duration-archive-title" className="text-title font-bold">{t('archiveDurationTitle', { name })}</h2>
    <p id="duration-archive-detail" className="flex items-start gap-inline text-sm">
      <Check aria-hidden className="size-5 shrink-0 text-lime" />{t('archiveDurationDetail')}
    </p>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex gap-inline">
      <Button variant="secondary" className="flex-1" disabled={busy} onClick={onCancel}>{t('keepDuration')}</Button>
      <Button variant="secondary" className="flex-1 border-danger/40! text-danger" disabled={busy} onClick={onConfirm}>{t('confirmDurationArchive')}</Button>
    </div>
  </ResponsiveDialog>;
}
