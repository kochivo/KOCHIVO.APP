'use client';

import { useState } from 'react';
import type { ComponentProps } from 'react';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { Segmented } from '@/ui/segmented';
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
  const label = (item: typeof tabs[number]) => loading || error ? t(item.label)
    : `${t(item.label)} ${formatNumber(filterPrograms(templates, item.id).length, locale)}`;
  return <div className="@container min-w-0 space-y-card-gap">
    <PageBarTitle title={t('programsTitle')} />
    <PageBarActions>
      <Button variant="secondary" className="hidden min-h-12 rounded-full px-stack text-xs min-[760px]:inline-flex" onClick={() => setGeneratorRequest(value => value + 1)}>
        <KoTemplate aria-hidden className="size-4" />{t('programAskKo')}</Button>
      <Button variant="secondary" className="min-h-12 rounded-full px-stack text-xs" onClick={() => setPicking(true)}>
        <KoPlayers aria-hidden className="size-4" />{t('programForPlayer')}</Button>
      <Button disabled={disabled} block={false} onClick={onCreate}>
        <KoPlus aria-hidden className="size-4" />{t('programNew')}</Button>
    </PageBarActions>
    <Segmented aria-label={t('programsTitle')} className="w-fit max-w-full" value={tab}
      options={[{ value: tabs[0].id, label: label(tabs[0]) }, { value: tabs[1].id, label: label(tabs[1]) }, { value: tabs[2].id, label: label(tabs[2]) }]}
      onChange={value => { const next = tabs.find(item => item.id === value); if (next) setTab(next.id); }} />
    {(createError || busy.length > 0) && <p role={createError ? 'alert' : 'status'} className="text-sm text-muted">{createError || t('savingChanges')}</p>}
    {loading ? <LoadingState variant="cards" /> : error ? <div role="alert" className="glass rounded-card p-card">
      <p>{error}</p><Button variant="secondary" onClick={onRetry}>{t('tryAgain')}</Button>
    </div> : <>
      {!visible.length && <p className="glass rounded-card p-card text-sm text-muted">{t('programEmpty')}</p>}
      <ul className="grid grid-cols-1 gap-card-gap min-[760px]:grid-cols-2 @min-[700px]:grid-cols-3 @min-[1000px]:grid-cols-4">
        {visible.map(template => <WorkspaceProgramCard key={template.id} template={template} error={errors[`program-${template.id}`]}
          busy={busy.includes(`program-${template.id}`)} onOpen={actions(template).onOpen} onAssign={actions(template).onAssign} onRetry={onRetry} />)}
      </ul>
    </>}
    {picking && <PlayerPicker onClose={() => setPicking(false)} />}
    {generatorRequest > 0 && <Generator request={generatorRequest} />}
  </div>;
}
