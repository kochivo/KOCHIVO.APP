'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Button } from '@/ui/button';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/core/i18n';
import type { SupplementRow } from '@/core/offline/tables';
import type { SupplementDraft } from '../data/captain';
import { timings } from '../model';
import { messages } from '../messages';

export function SupplementEditor({ initial, onSave, onClose }: {
  initial: SupplementRow | null; onSave: (draft: SupplementDraft) => Promise<void>; onClose: () => void;
}) {
  const t = useT(messages);
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    return () => { element?.close(); if (opener instanceof HTMLElement) opener.focus(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="supplement-editor-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="sheet fixed inset-x-0 inset-y-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card p-6 text-ink backdrop:bg-bg-deep/80 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-card">
    <form className="space-y-4" onSubmit={async event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const timing = timings.find(value => value === form.get('timing')) ?? 'any';
      setBusy(true); setError(false);
      try { await onSave({ name: String(form.get('name')), dose: String(form.get('dose')), notes: String(form.get('notes')), timing }); }
      catch { setError(true); setBusy(false); }
    }}>
      <h2 id="supplement-editor-title" className="text-xl font-bold">{t(initial ? 'edit' : 'add')}</h2>
      <label className="block">{t('name')}<input name="name" required maxLength={60} defaultValue={initial?.name} className="glass mt-1 min-h-12 w-full rounded-control px-3" /></label>
      <label className="block">{t('dose')}<input name="dose" maxLength={40} defaultValue={initial?.dose} className="glass mt-1 min-h-12 w-full rounded-control px-3" /></label>
      <label className="block">{t('timing')}<select name="timing" defaultValue={initial?.timing ?? 'any'} className="glass mt-1 min-h-12 w-full rounded-control px-3">
        {timings.map(timing => <option key={timing} value={timing}>{t(timing)}</option>)}
      </select></label>
      <label className="block">{t('notes')}<textarea name="notes" maxLength={300} defaultValue={initial?.notes} className="glass mt-1 min-h-24 w-full rounded-control p-3" /></label>
      {error && <p role="alert">{t('error')}</p>}
      <div className="flex gap-3"><button type="submit" disabled={busy} className="min-h-12 rounded-control bg-lime px-6 font-bold text-on-lime">{t('save')}</button>
        {captainWorkspaceEnabled() ? <Button variant="secondary" type="button" disabled={busy} className="min-h-12 px-4" onClick={onClose}>{t('cancel')}</Button> : <button type="button" disabled={busy} className="min-h-12 px-4" onClick={onClose}>{t('cancel')}</button>}</div>
    </form>
  </dialog>;
}
