'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { useEffect, useRef, useState } from 'react';
import { Files } from 'lucide-react';
import { Button, EmptyState } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import { exerciseName, foodName } from '@/lib/display-name';
import { starterText } from '@/lib/starter-text';
import { previewTemplate } from '../data/template-preview';
import type { TemplatePreview } from '../preview-model';
import type { Template } from '../types';

export function PreviewSheet({ template, onAssign, onClose }: { template: Template; onAssign: () => void; onClose: () => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let current = true;
    previewTemplate({ kind: template.kind, id: template.id }).then(result => {
      if (!current) return;
      if (result.error !== undefined) setError(result.error);
      else { setPreview(result.data); setError(''); }
    }).catch(() => { if (current) setError(t('couldntLoadPreview')); });
    return () => { current = false; };
  }, [attempt, template.id, template.kind, t]);
  const n = (value: number) => formatNumber(value, locale);
  const title = starterText(template.title, locale);
  const emptyAction = { label: t('chooseAnother'), onClick: onClose };
  return <dialog ref={dialog} aria-labelledby="preview-template-title" onCancel={onClose} onClose={onClose}
    className="sheet fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6 text-ink">
    <div className="grid gap-4">
      <h2 id="preview-template-title" className="text-xl font-bold">{t('previewTitle', { title })}</h2>
      {error ? <div role="alert" className="grid justify-items-start gap-2">{error}
        <Button variant="ghost" className="min-h-12" onClick={() => { setError(''); setPreview(null); setAttempt(value => value + 1); }}>{t('tryAgain')}</Button>
      </div> : !preview ? <LoadingState variant="detail" />
        : preview.groups.length === 0 ? <EmptyState icon={Files} title={t('nothingHereYet')} body={t('templateIsEmptyAddDaysOrMeals')} action={emptyAction} /> : <>
          {preview.kind === 'nutrition' && <p className="glass-strong w-fit rounded-control px-3 py-2 text-sm font-bold">{t('totalKcal', { kcal: n(preview.kcal) })}</p>}
          {preview.groups.map((group, index) => <section key={index} className="glass grid gap-2 rounded-card p-4">
            <h3 className="font-bold">{starterText(group.title, locale, template.title)}</h3>
            {group.items.length === 0 ? <EmptyState icon={Files} title={t('nothingHereYet')} body={t('templateIsEmptyAddDaysOrMeals')} action={emptyAction} /> : <ul className="grid gap-1.5 text-sm">
              {preview.kind === 'program'
                ? preview.groups[index]?.items.map((item, i) => <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 break-words">{exerciseName(item, locale)}</span>
                  <span dir="ltr" className="shrink-0 text-muted">{n(item.sets)} × {item.reps}
                    {item.rir != null && t('rirSuffix', { count: n(item.rir) })}</span>
                </li>)
                : preview.groups[index]?.items.map((item, i) => <li key={i} className="flex justify-between gap-3">
                  <span className="min-w-0 break-words">{foodName(item, locale)}</span>
                  <span className="shrink-0 text-muted">{t('gramsKcal', { grams: n(item.grams), kcal: n(item.kcal) })}</span>
                </li>)}
            </ul>}
          </section>)}
        </>}
      <div className="flex flex-wrap gap-2">
        <Button variant={preview?.groups.length ? 'primary' : 'secondary'} className="min-h-12" disabled={!preview || preview.groups.length === 0} onClick={onAssign}>{t('assignToPlayer')}</Button>
        <Button variant="ghost" className="min-h-12" onClick={onClose}>{t('close')}</Button>
      </div>
    </div>
  </dialog>;
}
