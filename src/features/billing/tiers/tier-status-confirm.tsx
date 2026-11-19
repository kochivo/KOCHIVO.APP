'use client';
import { Check } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from './messages';

export function TierStatusConfirm({ kind, name, count = 0, busy, error, onCancel, onConfirm }: {
  kind: 'archive' | 'delete'; name: string; count?: number; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void;
}) {
  const t = useT(messages), locale = useLocale();
  const archive = kind === 'archive';
  return <ResponsiveDialog modal role="alertdialog" aria-modal="true" aria-labelledby="tier-status-title"
    aria-describedby="tier-status-detail" aria-busy={busy} fallbackId="catalog-heading" onDismiss={onCancel}
    className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg space-y-card-gap overflow-y-auto rounded-card border border-line bg-surface p-card text-ink backdrop:bg-bg-deep/80">
    <h2 id="tier-status-title" className="text-title font-bold">{t(archive ? 'archiveTierTitle' : 'deleteTierTitle', { name })}</h2>
    {archive ? <ul id="tier-status-detail" className="space-y-stack text-sm">
      {[t('archiveTierPlayers', { n: formatNumber(count, locale) }, count), t('archiveTierVisibility'), t('archiveTierRestore')].map(line =>
        <li key={line} className="flex items-start gap-inline"><Check aria-hidden className="size-5 shrink-0 text-lime" />{line}</li>)}
    </ul> : <p id="tier-status-detail" className="text-sm">{t('deleteTierDetail')}</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex gap-inline">
      <Button variant="secondary" className="flex-1" disabled={busy} onClick={onCancel}>{t('keepTier')}</Button>
      <Button variant="secondary" className="flex-1 border-danger/40! text-danger" disabled={busy}
        onClick={onConfirm}>{t(archive ? 'confirmDurationArchive' : 'deleteTier')}</Button>
    </div>
  </ResponsiveDialog>;
}
