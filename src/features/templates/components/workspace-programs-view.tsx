'use client';

import { useState } from 'react';
import type { ComponentProps } from 'react';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { KoPlus } from '@/ui/icons/ko-plus';
import { KoPlayers } from '@/ui/icons/ko-players';
import { KoTemplate } from '@/ui/icons/ko-template';
import { messages } from '../messages';
import { filterPrograms } from './workspace-program-model';
import type { ProgramTab } from './workspace-program-model';
import { WorkspaceProgramCard } from './workspace-program-card';
import type { LibraryView } from './library-view';

const PlayerPicker = dynamic(() => import('./workspace-player-picker').then(module => module.WorkspacePlayerPicker), { loading: () => <LoadingState variant="list" /> });
const Generator = dynamic(() => import('./workspace-generator').then(module => module.WorkspaceGenerator), { loading: () => <LoadingState variant="list" /> });
const tabs = [{ id: 'mine', label: 'programMine' }, { id: 'ready', label: 'programReady' }, { id: 'assigned', label: 'programAssigned' }] as const;

export function WorkspaceProgramsView(props: ComponentProps<typeof LibraryView>) {
  const { templates, loading, error, creating, createError, busy, errors, onCreate, onRetry, actions } = props;
  const t = useT(messages), locale = useLocale();
  const [tab, setTab] = useState<ProgramTab>('mine');
  const [picking, setPicking] = useState(false), [generatorRequest, setGeneratorRequest] = useState(0);
  const visible = filterPrograms(templates, tab);
  const disabled = creating || loading || !!error;
  return <div className="@container min-w-0 space-y-4">
    <PageBarTitle title={t('programsTitle')} />
    <PageBarActions>
      <Button variant="secondary" className="hidden min-h-12 rounded-full px-3 text-xs min-[760px]:inline-flex" onClick={() => setGeneratorRequest(value => value + 1)}>
        <KoTemplate aria-hidden className="size-4" />{t('programAskKo')}</Button>
      <Button variant="secondary" className="min-h-12 rounded-full px-3 text-xs" onClick={() => setPicking(true)}>
        <KoPlayers aria-hidden className="size-4" />{t('programForPlayer')}</Button>
      <Button disabled={disabled} className="min-h-12 !w-auto rounded-full px-3 text-xs" onClick={onCreate}>
        <KoPlus aria-hidden className="size-4" />{t('programNew')}</Button>
    </PageBarActions>
    <div role="group" aria-label={t('programsTitle')} className="flex w-max max-w-full gap-1 overflow-x-auto rounded-full border border-line-soft bg-bg-deep/25 p-[3px]">
      {tabs.map(item => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)}
        className={`min-h-12 shrink-0 whitespace-nowrap rounded-full px-3 text-[11.5px] ${tab === item.id ? 'glass-strong text-ink' : 'text-muted'}`}>
        {t(item.label)}{!loading && !error && <span className="ms-1 tabular-nums">{formatNumber(filterPrograms(templates, item.id).length, locale)}</span>}
      </button>)}
    </div>
    {(createError || busy.length > 0) && <p role={createError ? 'alert' : 'status'} className="text-sm text-muted">{createError || t('savingChanges')}</p>}
    {loading ? <LoadingState variant="cards" /> : error ? <div role="alert" className="glass rounded-card p-5">
      <p>{error}</p><Button variant="secondary" onClick={onRetry}>{t('tryAgain')}</Button>
    </div> : <>
      {!visible.length && <p className="text-sm text-muted">{t('programEmpty')}</p>}
      <ul className="deferred-rows grid grid-cols-1 gap-4 @min-[701px]:grid-cols-3">
        {visible.map(template => <WorkspaceProgramCard key={template.id} template={template} error={errors[`program-${template.id}`]}
          busy={busy.includes(`program-${template.id}`)} onOpen={actions(template).onOpen} onAssign={actions(template).onAssign} onRetry={onRetry} />)}
        <li className="contents"><Button type="button" disabled={disabled} onClick={onCreate}
          variant={'secondary'} block={false} className={"flex min-h-[150px] flex-col items-center justify-center gap-1.5 p-[18px] text-lime disabled:opacity-40"}>
          <KoPlus aria-hidden className="size-6" /><span>{t('programNew')}</span><small className="text-muted">{t('programNewHint')}</small>
        </Button></li>
      </ul>
    </>}
    {picking && <PlayerPicker onClose={() => setPicking(false)} />}
    {generatorRequest > 0 && <Generator request={generatorRequest} />}
  </div>;
}
