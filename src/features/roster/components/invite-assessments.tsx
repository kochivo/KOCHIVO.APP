'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Lock, Plus, X } from 'lucide-react';
import { useArabicStyle, useLocale, useT } from '@/core/i18n/client';
import { FormPreviewEntry } from '@/features/forms';
import type { FormDraft } from '@/features/forms';
import { Button } from '@/ui/button';
import { formatNumber } from '@/lib/format';
import { inviteGateState, toggleInviteForm } from '../invite-start-forms';
import { messages } from '../invites/page-messages';
import { uuidv7 } from '@/core/offline/ids';

export function InviteAssessments({ forms, formIds, gate, onChange }: {
  forms: FormDraft[]; formIds: string[]; gate: boolean; onChange: (value: { formIds: string[]; gate: boolean }) => void;
}) {
  const t = useT(messages), locale = useLocale(), style = useArabicStyle();
  const [preview, setPreview] = useState<FormDraft>();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (preview) node?.showModal();
    return () => node?.close();
  }, [preview]);
  const state = inviteGateState(formIds, gate);
  const create = `/${locale}/captain/library/forms?template=custom`;
  const linkClass = 'press glass inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-control border border-line px-4 text-sm hover:bg-ink/10 focus-visible:ring-2 focus-visible:ring-lime';
  return <div className="space-y-3">
    <div className="glass-strong flex items-start gap-3 rounded-[16px] p-4">
      <Lock aria-hidden className="mt-2 size-5 shrink-0 text-muted" />
      <div className="flex-1"><label htmlFor="invite-start-gate" className="font-semibold">{t('gate')}</label><p id="invite-gate-hint" className="mt-1 text-xs leading-6 text-muted">{t('gateHint')}</p></div>
      <button id="invite-start-gate" type="button" role="switch" aria-label={t('gate')} aria-describedby="invite-gate-hint" aria-checked={state.checked} disabled={state.disabled}
        onClick={() => onChange({ formIds, gate: !state.checked })} className="press flex min-h-12 min-w-12 shrink-0 cursor-pointer items-center justify-center rounded-control focus-visible:ring-2 focus-visible:ring-lime disabled:opacity-40">
        <span aria-hidden className={`relative h-6 w-11 rounded-full border border-line ${state.checked ? 'bg-lime' : 'glass'}`}><span className={`absolute top-0.5 size-[18px] rounded-full ${state.checked ? 'start-0.5 bg-on-lime' : 'end-0.5 bg-muted'}`} /></span>
      </button>
    </div>
    <p className="text-xs text-muted">{t('formLimit')}</p>
    {!forms.length && <p className="py-3 text-sm text-muted">{t('noForms')}</p>}
    {forms.map(form => <div key={form.id} className="glass flex items-center gap-2 rounded-[14px] border border-line px-3">
      <label className="flex min-h-16 flex-1 cursor-pointer items-center gap-3 py-3">
        <input type="checkbox" checked={formIds.includes(form.id)} disabled={!formIds.includes(form.id) && formIds.length >= 5}
          onChange={() => onChange(toggleInviteForm(formIds, gate, form.id))} className="size-5 accent-lime" />
        <span><span className="block text-sm font-semibold">{form.title}</span><span className="text-xs text-muted">{t('questions', { n: formatNumber(form.questions.length, locale) })}</span></span>
      </label>
      <Button variant="secondary" onClick={() => setPreview(form)} className="min-h-12 text-xs">{t('preview')}</Button>
    </div>)}
    <Link href={create} target="_blank" rel="noopener noreferrer" onClick={event => { event.currentTarget.href = `${create}&draft=${uuidv7()}`; }}
      className={`${linkClass} w-full border-dashed`}><Plus aria-hidden className="size-4" />{t(forms.length ? 'newForm' : 'firstForm')}</Link>
    {preview && <dialog ref={dialog} onCancel={() => setPreview(undefined)} aria-modal="true" aria-label={t('preview')} className="sheet fixed inset-0 z-50 m-auto max-h-[85dvh] w-[min(92vw,600px)] overflow-y-auto rounded-card border border-line bg-surface p-4 text-ink backdrop:bg-bg-deep/80">
      <div className="mb-3 flex justify-end"><Button variant="secondary" onClick={() => setPreview(undefined)} aria-label={t('back')}><X aria-hidden className="size-5" /></Button></div>
      <FormPreviewEntry key={preview.id} form={preview} locale={locale} style={style} />
    </dialog>}
  </div>;
}
