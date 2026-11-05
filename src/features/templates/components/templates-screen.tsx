'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useEffect, useRef, useState } from 'react';
import { uuidv7 } from '@/core/offline/ids';
import { applyOptimistic } from '@/lib/optimistic';
import { Button } from '@/ui';
import { copyTemplate, deleteTemplate, listTemplates, renameTemplate } from '../data/templates';
import type { Template, TemplateKind } from '../types';
import { AssignSheet } from './assign-sheet';
import { PreviewSheet } from './preview-sheet';
import { starterText } from '@/lib/starter-text';
import { useRouter } from 'next/navigation';
import { createTemplate } from '../data/templates';
import { TemplateSection } from './template-section';
import { useToast } from '@/ui/toast';
import { messages as uiMessages } from '@/ui/messages';

type Edit = { template: Template; title: string } | { template: Template; title?: never };

export function TemplatesScreen() {
  const t = useT(messages);
  const feedback = useT(uiMessages);
  const toast = useToast();
  const locale = useLocale();
  const router = useRouter();
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
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  async function create() {
    if (!lock(['create'])) return;
    setCreating(true); setCreateError('');
    try {
      const result = await createTemplate({ kind });
      if (result.error !== undefined) { setCreateError(result.error); return; }
      router.push(`/captain/${kind === 'program' ? 'programs' : 'nutrition'}/${result.data}`);
    } catch { setCreateError(t('couldntSaveTemplateTryAgain')); }
    finally { setCreating(false); unlock(['create']); }
  }
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
      toast.success(feedback('templateCopied'));
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
    {busy.length > 0 && <p role="status">{t('savingChanges')}</p>}
    {createError && <p role="alert" className="text-danger">{createError}</p>}
    {[false, true].map(starter => <TemplateSection key={String(starter)} starter={starter}
      templates={visible.filter(template => template.starter === starter)} loading={loading} error={loadError}
      busy={busy} errors={errors} creating={creating}
      onRetry={() => { setLoading(true); setAttempt(value => value + 1); }} onCreate={create}
      onPreview={setPreviewing} onAssign={setSelected} onCopy={template => void duplicate(template)}
      onRename={(template, title) => void edit({ template, title })} onDelete={template => void edit({ template })} />)}
    {previewing && <PreviewSheet template={previewing} onClose={() => setPreviewing(null)}
      onAssign={() => { setSelected(previewing); setPreviewing(null); }} />}
    {selected && <AssignSheet template={selected} onClose={() => setSelected(null)} />}
  </div>;
}
