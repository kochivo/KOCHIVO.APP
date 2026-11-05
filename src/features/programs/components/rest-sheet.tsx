'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { Button, Chip, Stepper } from '@/ui';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../messages';
import { restPresets, restText } from './builder-fields';

export function RestSheet({ value, openerId, onClose, onChange }: {
  value: number; openerId: string; onClose: () => void; onChange: (seconds: number) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  return <ResponsiveDialog modal fallbackId={openerId} openerId={openerId} onDismiss={onClose}
    aria-label={t('rest')} dir={locale === 'ar' ? 'rtl' : 'ltr'}
    className="sheet fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-md space-y-4 rounded-card p-5 text-ink backdrop:bg-bg-deep/80">
    <div className="flex items-center justify-between gap-3"><h2>{t('rest')}</h2>
      <Button variant="secondary" onClick={onClose}>{t('closeEditor')}</Button></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label={t('rest')}>
      {restPresets.map(seconds => <Chip key={seconds} pressed={seconds === value} onClick={() => onChange(seconds)}>
        {restText(seconds, locale)}
      </Chip>)}
    </div>
    <Stepper label={t('rest')} value={value} min={0} max={900} step={15}
      format={seconds => restText(seconds, locale)} onChange={onChange} />
  </ResponsiveDialog>;
}
