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
      <div className="flex flex-wrap items-center gap-3">
        <span className="glass-raised inline-flex rounded-chip px-3 py-1 text-sm text-muted">{statuses[draft.status]}</span>
        {dirty && <span role="status" className="text-sm text-muted">{t('unsavedChanges')}</span>}
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {!dirty && !busy && draft.player_id && <SaveTemplateButton kind="program" id={draft.id} title={draft.title} />}
      <Button variant="secondary" className="min-h-12" disabled={busy} onClick={onSave}>{t('save')}</Button>
      <div className="glass-strong fixed start-[var(--safe-start)] end-[var(--safe-end)] bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-30 p-3 lg:static lg:bg-transparent lg:p-0 lg:shadow-none">
        <Button className="min-h-12" disabled={busy} onClick={onActivate}>{t('activateForPlayer')}</Button>
      </div>
    </div>
  </header>;
}
