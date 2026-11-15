'use client';

import { KoPlus } from '@/ui/icons/ko-plus';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useState } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { LoadingState } from '@/ui/loading-state';
import { messages } from '../library-messages';
import { messages as templateMessages } from '../messages';
import { filterTemplates } from '../library-model';
import { LibraryCard } from './library-card';
import { WorkspaceProgramsView } from './workspace-programs-view';
import type { LibraryTemplate } from '../library-types';
import type { TemplateKind } from '../types';
import type { ComponentProps, ReactNode } from 'react';

type Actions = Omit<ComponentProps<typeof LibraryCard>, 'template' | 'busy' | 'error'>;
export function LibraryView(props: {
  kind: TemplateKind; templates: LibraryTemplate[]; loading: boolean; error: string; createError: string;
  creating: boolean; busy: string[]; errors: Record<string, string>; onCreate: () => void; onRetry: () => void;
  actions: (template: LibraryTemplate) => Actions; tools?: ReactNode;
}) {
  const { kind, templates, loading, error, createError, creating, busy, errors, onCreate, onRetry, actions, tools } = props;
  const PlusIcon = captainWorkspaceEnabled() ? KoPlus : Plus;
  const t = useT(messages), tt = useT(templateMessages);
  const [query, setQuery] = useState(''), [level, setLevel] = useState('all'), [archived, setArchived] = useState(false);
  const training = kind === 'program';
  const visible = filterTemplates(templates.filter(row => !!row.archived === archived), query, level);
  if (training && captainWorkspaceEnabled()) return <WorkspaceProgramsView {...props} />;
  return <div className="min-w-0">
    <header className="mb-[18px] flex flex-wrap items-center gap-3.5">
      <div className="me-auto"><h1 className="font-display text-[30px] font-semibold leading-tight">{t(training ? 'training' : 'nutrition')}</h1>
        <p className="mt-1 text-sm text-muted">{t(training ? 'trainingSub' : 'nutritionSub')}</p></div>
      <Button disabled={creating || loading || !!error} className="min-h-12 rounded-full" onClick={onCreate}><PlusIcon aria-hidden className="size-4" />{t(training ? 'newTraining' : 'newNutrition')}</Button>
    </header>
    {training && <div className="mb-3.5 flex flex-wrap items-center gap-2">
      {(['all', 'beginner', 'intermediate', 'advanced'] as const).map(value => <Chip key={value} pressed={level === value} className={level === value ? '!border-ink !bg-ink !text-bg-deep' : 'bg-transparent text-muted'} onClick={() => setLevel(value)}>{t(value)}</Chip>)}
      <label className="ms-auto flex min-h-12 w-full items-center gap-2 rounded-full border border-line-soft px-4 sm:w-auto"><Search aria-hidden className="size-4 text-faint" />
        <input aria-label={t('search')} placeholder={t('search')} value={query} onChange={event => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label>
    </div>}
    {(createError || busy.length > 0) && <p role={createError ? 'alert' : 'status'} className="mb-3 text-sm text-muted">{createError || tt('savingChanges')}</p>}
    {loading ? <LoadingState variant="cards" /> : error ? <div role="alert" className="glass rounded-card p-5">{error}<Button variant="secondary" onClick={onRetry}>{tt('tryAgain')}</Button></div> :
      visible.length ? <ul className={training ? 'deferred-rows grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3' : 'deferred-rows glass rounded-card border border-line-soft'}>{visible.map(template => <LibraryCard key={template.id} template={template}
        busy={busy.includes(`${kind}-${template.id}`)} error={errors[`${kind}-${template.id}`]} {...actions(template)} />)}</ul> :
        <p className="glass rounded-card border border-line-soft p-5 text-faint">{t(query || level !== 'all' ? 'noMatches' : training ? 'emptyTraining' : 'emptyNutrition')}</p>}
    <details className="group mt-5 text-sm text-muted"><summary className="flex min-h-12 cursor-pointer items-center">{t('tools')}<ChevronDown aria-hidden className="ms-auto size-4 transition-transform group-open:rotate-180" /></summary>
      <label className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={archived} onChange={event => setArchived(event.target.checked)} />{t('archived')}</label>{tools}</details>
  </div>;
}
