'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Button } from '@/ui/button';
import { useId, useState } from 'react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import { normalizePrize } from '../data/save-crown-prize';
import { messages } from '../messages';

export function CrownPrizeEditor({ locale, prize, onSave, saving = false, error = false, editing = false }: {
  locale: Locale; prize: string | null; onSave: (value: string | null) => Promise<void>;
  saving?: boolean; error?: boolean; editing?: boolean;
}) {
  const t = createT(messages, locale);
  const id = useId();
  const [open, setOpen] = useState(editing);
  const [draft, setDraft] = useState(prize ?? '');
  const [invalid, setInvalid] = useState(false);
  async function save() {
    let value: string | null;
    try { value = normalizePrize(draft); } catch { setInvalid(true); return; }
    setInvalid(false);
    setOpen(false);
    try { await onSave(value); } catch { setOpen(true); }
  }
  return <section className="glass space-y-stack rounded-card p-card" aria-busy={saving}>
    {open ? <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-stack">
      <label htmlFor={id} className="block font-bold">{t('prizeLabel')}</label>
      <input id={id} value={draft} maxLength={120} disabled={saving}
        aria-invalid={invalid} aria-describedby={`${id}-counter${invalid ? ` ${id}-error` : ''}`}
        onChange={event => { setDraft(event.target.value); setInvalid(false); }}
        className="min-h-12 w-full rounded-control border border-line bg-surface px-stack text-start" />
      <p id={`${id}-counter`} className="text-sm text-muted">{t('prizeCounter', { count: formatNumber(draft.length, locale) })}</p>
      {invalid && <p id={`${id}-error`} role="alert" className="text-sm text-danger">{t('prizeLength')}</p>}
      <div className="flex gap-stack">
        <Button type="submit" disabled={saving} variant={'primary'} block={false} className={"min-h-12 px-page-x font-bold"}>{t('savePrize')}</Button>
        {captainWorkspaceEnabled() ? <Button variant="secondary" type="button" disabled={saving} onClick={() => { setOpen(false); setInvalid(false); }}
          className="min-h-12 rounded-control px-page-x">{t('cancelPrize')}</Button> : <button type="button" disabled={saving} onClick={() => { setOpen(false); setInvalid(false); }}
          className="min-h-12 rounded-control px-page-x">{t('cancelPrize')}</button>}
      </div>
    </form> : <div className="flex flex-wrap items-center gap-stack">
      {prize && <p className="min-w-0 flex-1 break-words">{t('prize', { prize })}</p>}
      {captainWorkspaceEnabled() ? <Button variant="secondary" type="button" disabled={saving} onClick={() => { setDraft(prize ?? ''); setOpen(true); }}
        className="min-h-12 rounded-control px-page-x font-bold text-ink">{t(prize ? 'editPrize' : 'setPrize')}</Button> : <button type="button" disabled={saving} onClick={() => { setDraft(prize ?? ''); setOpen(true); }}
        className="min-h-12 rounded-control px-page-x font-bold text-lime">{t(prize ? 'editPrize' : 'setPrize')}</button>}
    </div>}
    {error && <p role="alert" className="text-sm text-danger">{t('prizeError')}</p>}
  </section>;
}
