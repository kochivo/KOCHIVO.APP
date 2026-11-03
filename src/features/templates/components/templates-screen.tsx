'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { useEffect, useRef, useState } from 'react';
import { uuidv7 } from '@/core/offline/ids';
import { applyOptimistic } from '@/lib/optimistic';
import { Copy, Eye, Files, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/ui';
import { copyTemplate, deleteTemplate, listTemplates, renameTemplate } from '../data/templates';
import type { Template, TemplateKind } from '../types';
import { AssignSheet } from './assign-sheet';
import { PreviewSheet } from './preview-sheet';
import { starterText } from '@/lib/starter-text';

type Edit = { template: Template; title: string } | { template: Template; title?: never };

export function TemplatesScreen() {
  const t = useT(messages);
  const locale = useLocale();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [kind, setKind] = useState<TemplateKind>('program');
  const [selected, setSelected] = useState<Template | null>(null);
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string[]>([]);
  const inFlight = useRef(new Set<string>());
  const [deleted, setDeleted] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    listTemplates().then(result => {
      if (!current) return;
      if (result.error !== undefined) setLoadError(result.error);
      else { setTemplates(result.data); setLoadError(''); }
      setLoading(false);
    }).catch(() => {
      if (current) { setLoadError(t('couldntLoadTemplatesTryAgain')); setLoading(false); }
    });
    return () => { current = false; };
  }, [attempt, t]);
  const keyOf = (template: Template) => `${template.kind}-${template.id}`;
  function lock(keys: string[]) {
    if (keys.some(key => inFlight.current.has(key))) return false;
    keys.forEach(key => inFlight.current.add(key));
    setBusy([...inFlight.current]);
    return true;
  }
  function unlock(keys: string[]) {
    keys.forEach(key => inFlight.current.delete(key));
    setBusy([...inFlight.current]);
  }
  async function edit(change: Edit) {
    const key = keyOf(change.template);
    if (!lock([key])) return;
    const matches = (item: Template) => item.id === change.template.id && item.kind === change.template.kind;
    setErrors(current => ({ ...current, [key]: '' }));
    let failure = t('couldntSaveChangesTryAgain');
    try {
      await applyOptimistic(change.template, {
        apply: () => change.title !== undefined
          ? setTemplates(current => current.map(item => matches(item) ? { ...item, title: change.title } : item))
          : setDeleted(current => [...current, key]),
        rollback: previous => setTemplates(current => current.map(item => matches(item) ? previous : item)),
        reconcile: () => { if (change.title === undefined) setTemplates(current => current.filter(item => !matches(item))); },
      }, async () => {
        const input = { kind: change.template.kind, id: change.template.id };
        const result = change.title !== undefined
          ? await renameTemplate({ ...input, title: change.title }) : await deleteTemplate(input);
        if (result.error !== undefined) { failure = result.error; throw new Error(failure); }
      });
    } catch {
      setErrors(current => ({ ...current, [key]: failure }));
    } finally { setDeleted(current => current.filter(item => item !== key)); unlock([key]); }
  }
  async function duplicate(template: Template) {
    const placeholder = { ...template, id: uuidv7(), starter: false,
      title: t('copyOf', { title: starterText(template.title, locale) }).slice(0, 80) };
    const keys = [keyOf(template), keyOf(placeholder)];
    if (!lock(keys)) return;
    setErrors(current => ({ ...current, [keyOf(template)]: '' }));
    let failure = t('couldntSaveChangesTryAgain');
    try {
      await applyOptimistic(template, {
        apply: () => setTemplates(current => [placeholder, ...current]),
        rollback: () => setTemplates(current => current.filter(item => item.id !== placeholder.id)),
        reconcile: id => setTemplates(current => current.map(item => item.id === placeholder.id ? { ...item, id } : item)),
      }, async () => {
        const result = await copyTemplate({ kind: template.kind, id: template.id, title: placeholder.title });
        if (result.error !== undefined) { failure = result.error; throw new Error(failure); }
        return result.data;
      });
    } catch { setErrors(current => ({ ...current, [keyOf(template)]: failure })); }
    finally { unlock(keys); }
  }
  const visible = templates.filter(template => template.kind === kind && !deleted.includes(keyOf(template)));
  return <div className="mx-auto grid max-w-5xl gap-6">
    <header className="space-y-2">
      <p className="font-display text-sm text-muted">{t('templates')}</p>
      <h1 className="text-3xl font-extrabold">{t('yourTemplates')}</h1>
      <p className="text-muted">{t('saveYourWorkAndGiveAnyPlayer')}</p>
    </header>
    <div role="group" aria-label={t('templateType')} className="glass flex w-fit gap-2 rounded-control p-1">
      {(['program', 'nutrition'] as const).map(tab => <Button key={tab} variant="ghost" className={`min-h-12 ${kind === tab ? 'glass-strong font-bold' : 'text-muted'}`}
        aria-pressed={kind === tab} onClick={() => setKind(tab)}>{tab === 'program' ? t('workouts') : t('nutrition')}</Button>)}
    </div>
    {loading ? <p role="status">{t('loadingTemplates')}</p> : loadError ? <div role="alert" className="glass rounded-card p-5">{loadError}
      <Button variant="ghost" className="min-h-12" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>{t('tryAgain')}</Button>
    </div> : <>
      {busy.length > 0 && <p role="status">{t('savingChanges')}</p>}
      {visible.length === 0 ? <div className="glass grid justify-items-start gap-3 rounded-card p-8">
        <Files aria-hidden className="size-8 text-muted" />
        <p>{t('noTemplatesYetOpenAPlayersProgram')}</p>
      </div> : <ul className="grid gap-4 sm:grid-cols-2">
        {visible.map(template => <li key={`${template.kind}-${template.id}`} className="glass flex flex-col gap-4 rounded-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <h2 className="break-words text-xl font-bold">{starterText(template.title, locale)}</h2>
              {template.starter && <p className="w-fit rounded-full bg-lime-soft px-2.5 py-0.5 text-xs font-bold text-lime">{t('starterBadge')}</p>}
            </div>
            <span className="glass-strong shrink-0 rounded-control px-3 py-2 text-sm">{t(kind === 'program' ? 'dayCount' : 'mealCount', { n: template.count, count: formatNumber(template.count, locale) })}</span>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="min-h-12" disabled={busy.includes(keyOf(template))} onClick={() => setPreviewing(template)}><Eye aria-hidden className="size-5" />{t('preview')}</Button>
            <Button variant="secondary" className="min-h-12 flex-1" disabled={busy.includes(keyOf(template))} onClick={() => setSelected(template)}>{t('assignToPlayer')}</Button>
            <Button variant="ghost" className="min-h-12" disabled={busy.includes(keyOf(template))} onClick={() => void duplicate(template)}><Copy aria-hidden className="size-5" />{t('copy')}</Button>
            {!template.starter && <>
              <Button variant="ghost" className="min-h-12 min-w-12" aria-label={t('rename', { v0: template.title })} disabled={busy.includes(keyOf(template))} onClick={() => {
                const title = window.prompt(t('newTemplateName'), template.title);
                if (title !== null) void edit({ template, title: title.trim() });
              }}><Pencil aria-hidden className="size-5" /></Button>
              <Button variant="ghost" className="min-h-12 min-w-12" aria-label={t('delete', { v0: template.title })} disabled={busy.includes(keyOf(template))} onClick={() => {
                if (window.confirm(t('deleteTemplatePlayerCopiesWillStayUnchanged', { v0: template.title }))) void edit({ template });
              }}><Trash2 aria-hidden className="size-5" /></Button>
            </>}
          </div>
          {errors[keyOf(template)] && <p role="alert" className="text-sm text-danger">{errors[keyOf(template)]}</p>}
        </li>)}
      </ul>}
    </>}
    {previewing && <PreviewSheet template={previewing} onClose={() => setPreviewing(null)}
      onAssign={() => { setSelected(previewing); setPreviewing(null); }} />}
    {selected && <AssignSheet template={selected} onClose={() => setSelected(null)} />}
  </div>;
}
