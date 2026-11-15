'use client';

import { useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button, IconButton } from '@/ui';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../messages';

export function BuilderMenu({ id, fallbackId, label, name, actions, onDelete }: {
  id: string; fallbackId: string; label: string; name: string;
  actions: { label: string; disabled?: boolean; onClick: () => void }[];
  onDelete: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const close = () => { setOpen(false); setConfirm(false); };
  return <>
    <IconButton id={id} aria-label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <MoreVertical aria-hidden className="size-5" />
    </IconButton>
    {open && <ResponsiveDialog modal fallbackId={fallbackId} openerId={id} onDismiss={close} aria-label={label}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className="sheet fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-sm space-y-stack rounded-card p-card text-ink backdrop:bg-bg-deep/80">
      <Button variant="ghost" block onClick={close}>{t('cancelRest')}</Button>
      {confirm ? <>
        <p className="break-words">{t('deletePrompt', { name })}</p>
        <Button variant="secondary" block onClick={() => { onDelete(); close(); }}>{t('confirmDelete')}</Button>
      </> : <>
        {actions.map(action => <Button key={action.label} variant="ghost" block disabled={action.disabled}
          onClick={() => { action.onClick(); close(); }}>{action.label}</Button>)}
        <Button variant="ghost" block onClick={() => setConfirm(true)}>{t('confirmDelete')}</Button>
      </>}
    </ResponsiveDialog>}
  </>;
}
