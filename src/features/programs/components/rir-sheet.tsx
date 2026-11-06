'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button, Chip } from '@/ui';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../messages';

export function RirSheet({ value, openerId, onClose, onChange }: {
  value: number | null; openerId: string; onClose: () => void; onChange: (rir: number | null) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  return <ResponsiveDialog modal fallbackId={openerId} openerId={openerId} onDismiss={onClose}
    aria-label={t('rir')} dir={locale === 'ar' ? 'rtl' : 'ltr'}
    className="sheet fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-md space-y-4 rounded-card p-5 text-ink backdrop:bg-bg-deep/80">
    <div className="flex items-center justify-between gap-3"><h2>{t('rir')}</h2>
      <Button variant="secondary" onClick={onClose}>{t('closeEditor')}</Button></div>
    <p className="text-sm text-muted">{t('rirHint')}</p>
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('rir')}>
      {[null, 0, 1, 2, 3, 4, 5].map(rir => <Chip key={rir ?? 'none'} pressed={rir === value}
        onClick={() => onChange(rir)}>{rir === null ? t('noRir') : formatNumber(rir, locale)}</Chip>)}
    </div>
  </ResponsiveDialog>;
}
