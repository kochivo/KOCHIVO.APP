'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';

import { useEffect, useState } from 'react';
import { Files, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/ui';
import { deleteTemplate, listTemplates, renameTemplate } from '../data/templates';
import type { Template, TemplateKind } from '../types';
import { AssignSheet } from './assign-sheet';

type Edit = { template: Template; title: string } | { template: Template; title?: never };

export function TemplatesScreen() {
  const t = useT(messages);
  const locale = useLocale();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [kind, setKind] = useState<TemplateKind>('program');
  const [selected, setSelected] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [failedEdit, setFailedEdit] = useState<Edit | null>(null);
  const [busy, setBusy] = useState(false);
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
  async function edit(change: Edit) {
    if (busy) return;
    const before = templates;
    const matches = (item: Template) => item.id === change.template.id && item.kind === change.template.kind;
    setBusy(true); setError(''); setFailedEdit(null);
    setTemplates(current => change.title !== undefined
      ? current.map(item => matches(item) ? { ...item, title: change.title } : item)
      : current.filter(item => !matches(item)));
    try {
      const input = { kind: change.template.kind, id: change.template.id };
      const result = change.title !== undefined
        ? await renameTemplate({ ...input, title: change.title }) : await deleteTemplate(input);
      if (result.error !== undefined) {
        setTemplates(before); setError(result.error); setFailedEdit(change);
      }
    } catch {
      setTemplates(before); setError(t('couldntSaveChangesTryAgain')); setFailedEdit(change);
    } finally { setBusy(false); }
  }
  const visible = templates.filter(template => template.kind === kind);
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
      {busy && <p role="status">{t('savingChanges')}</p>}
      {error && <div role="alert" className="text-danger">{error}
        <Button variant="ghost" className="min-h-12" disabled={busy} onClick={() => { if (failedEdit) void edit(failedEdit); }}>{t('tryAgain')}</Button>
      </div>}
      {visible.length === 0 ? <div className="glass grid justify-items-start gap-3 rounded-card p-8">
        <Files aria-hidden className="size-8 text-muted" />
        <p>{t('noTemplatesYetOpenAPlayersProgram')}</p>
      </div> : <ul className="grid gap-4 sm:grid-cols-2">
        {visible.map(template => <li key={`${template.kind}-${template.id}`} className="glass flex flex-col gap-4 rounded-card p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="break-words text-xl font-bold">{template.title}</h2>
            <span className="glass-strong shrink-0 rounded-control px-3 py-2 text-sm">{t(kind === 'program' ? 'dayCount' : 'mealCount', { n: template.count, count: formatNumber(template.count, locale) })}</span>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <Button variant="secondary" className="min-h-12 flex-1" disabled={busy} onClick={() => setSelected(template)}>{t('assignToPlayer')}</Button>
            <Button variant="ghost" className="min-h-12 min-w-12" aria-label={t('rename', { v0: template.title })} disabled={busy} onClick={() => {
              const title = window.prompt(t('newTemplateName'), template.title);
              if (title !== null) void edit({ template, title: title.trim() });
            }}><Pencil aria-hidden className="size-5" /></Button>
            <Button variant="ghost" className="min-h-12 min-w-12" aria-label={t('delete', { v0: template.title })} disabled={busy} onClick={() => {
              if (window.confirm(t('deleteTemplatePlayerCopiesWillStayUnchanged', { v0: template.title }))) void edit({ template });
            }}><Trash2 aria-hidden className="size-5" /></Button>
          </div>
        </li>)}
      </ul>}
    </>}
    {selected && <AssignSheet template={selected} onClose={() => setSelected(null)} />}
  </div>;
}
