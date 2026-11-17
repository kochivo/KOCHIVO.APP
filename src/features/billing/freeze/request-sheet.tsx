'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { Stepper } from '@/ui/stepper';
import { TextField } from '@/ui/text-field';
import { Button } from '@/ui/button';
import { messages } from './messages';
import { freezeInput } from './model';

export function RequestSheet({ remaining, onClose, onSend }: {
  remaining: number; onClose: () => void; onSend: (days: number, note: string | null) => void;
}) {
  const t = useT(messages);
  const [days, setDays] = useState(1), [note, setNote] = useState('');
  const value = freezeInput(days, note, remaining);
  return <ResponsiveDialog modal fallbackId="freeze-request-trigger" onDismiss={onClose} aria-labelledby="freeze-sheet-title"
    className="sheet fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-32px)] max-w-lg space-y-card-gap overflow-y-auto rounded-card border border-line bg-surface p-card text-ink backdrop:bg-bg-deep/80">
    <h2 id="freeze-sheet-title" className="font-display text-title">{t('title')}</h2>
    <Stepper label={t('days')} min={1} max={Math.min(90, remaining)} step={1} value={days} onChange={setDays} />
    <TextField label={t('note')} value={note} maxLength={200} onChange={event => setNote(event.target.value)} />
    <div className="flex gap-inline">
      <Button disabled={!value} onClick={() => { if (value) onSend(value.days, value.note); }}>{t('send')}</Button>
      <Button variant="secondary" onClick={onClose}>{t('close')}</Button>
    </div>
  </ResponsiveDialog>;
}
