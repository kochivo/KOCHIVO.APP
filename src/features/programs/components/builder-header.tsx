'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { Button, TextField } from '@/ui';
import { SaveTemplateButton, templateMessages } from '@/features/templates';
import type { ProgramDraft } from '../types';

export function BuilderHeader({ draft, dirty, busy, onTitle, onSave, onActivate }: {
  draft: ProgramDraft; dirty: boolean; busy: boolean;
  onTitle: (title: string) => void; onSave: () => void; onActivate: () => void;
}) {
  const t = useT(messages);
  const templateT = useT(templateMessages);
  const statuses = { draft: t('draft'), active: t('active'), archived: t('archived') };
  return <header className="flex flex-wrap items-end justify-between gap-card-gap">
    <div className="min-w-0 flex-1 basis-full space-y-inline sm:basis-auto">
      <h1 className="text-2xl font-extrabold">{t('programBuilder')}</h1>
      <TextField label={t('programName')} maxLength={80} value={draft.title} onChange={event => onTitle(event.target.value)} disabled={busy} />
      <div className="flex flex-wrap items-center gap-stack">
        <span className="glass-raised inline-flex rounded-chip px-stack py-inline text-sm text-muted">{statuses[draft.status]}</span>
        {dirty && <span role="status" className="text-sm text-muted">{t('unsavedChanges')}</span>}
      </div>
    </div>
    <div className="flex flex-wrap gap-inline">
      {!dirty && !busy && draft.player_id && <SaveTemplateButton kind="program" id={draft.id} title={draft.title} />}
      <Button variant={draft.player_id ? 'secondary' : 'primary'} className="min-h-12" disabled={busy} onClick={onSave}>{draft.player_id ? t('save') : templateT('saveTemplate')}</Button>
      {draft.player_id && <div className="sheet fixed start-[var(--safe-start)] end-[var(--safe-end)] bottom-[var(--nav-clearance)] z-20 h-[var(--builder-action-height)] p-stack lg:static lg:h-auto lg:border-0 lg:bg-transparent lg:p-0">
        <Button className="min-h-12" disabled={busy} onClick={onActivate}>{t('activateForPlayer')}</Button>
      </div>}
    </div>
  </header>;
}
