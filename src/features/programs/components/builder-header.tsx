'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { Button, TextField } from '@/ui';
import { SaveTemplateButton } from '@/features/templates';
import type { ProgramDraft } from '../types';

export function BuilderHeader({ draft, dirty, busy, onTitle, onSave, onActivate }: {
  draft: ProgramDraft; dirty: boolean; busy: boolean;
  onTitle: (title: string) => void; onSave: () => void; onActivate: () => void;
}) {
  const t = useT(messages);
  const statuses = { draft: t('draft'), active: t('active'), archived: t('archived') };
  return <header className="flex flex-wrap items-end justify-between gap-4">
    <div className="min-w-0 flex-1 space-y-2">
      <h1 className="text-2xl font-extrabold">{t('programBuilder')}</h1>
      <TextField label={t('programName')} maxLength={80} value={draft.title} onChange={event => onTitle(event.target.value)} disabled={busy} />
      <span className="glass-raised inline-flex rounded-full px-3 py-1 text-sm text-muted">{statuses[draft.status]}{dirty ? t('unsavedChanges') : ''}</span>
    </div>
    <div className="flex flex-wrap gap-2">
      {!dirty && !busy && draft.player_id && <SaveTemplateButton kind="program" id={draft.id} title={draft.title} />}
      <Button variant="ghost" className="min-h-12" disabled={busy} onClick={onSave}>{t('save')}</Button>
      <Button className="min-h-12" disabled={busy} onClick={onActivate}>{t('activateForPlayer')}</Button>
    </div>
  </header>;
}
