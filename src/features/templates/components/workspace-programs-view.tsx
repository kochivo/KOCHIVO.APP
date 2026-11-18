'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button, buttonClass } from '@/ui/button';
import { messages as phoneMessages } from './phone/messages';
import { LoadingState } from '@/ui/loading-state';
import { Segmented } from '@/ui/segmented';
import { usePageBarTarget } from '@/ui/page-bar-slot';
import { RowChevron } from '@/ui/row-chevron';
import { PageBarActions } from '@/ui/page-bar-actions';
import { PageBarMenu } from '@/ui/page-bar-menu';
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
  const phone = useT(phoneMessages);
  const titleTarget = usePageBarTarget('title');
  const [tab, setTab] = useState<ProgramTab>('mine');
  const [picking, setPicking] = useState(false), [generatorRequest, setGeneratorRequest] = useState(0);
  const visible = filterPrograms(templates, tab);
  const disabled = creating || loading || !!error;
  const label = (item: typeof tabs[number]) => loading || error ? t(item.label)
    : `${t(item.label)} ${formatNumber(filterPrograms(templates, item.id).length, locale)}`;
  return <div className="@container min-w-0 space-y-card-gap">
    {titleTarget && createPortal(<>
      <h1 className="text-base font-semibold max-md:hidden">{t('programsTitle')}</h1>
      <div className="flex items-center gap-stack md:hidden">
        <Link href="/captain" aria-label={phone('back')} className={buttonClass({ variant: 'secondary', block: false, className: 'min-w-12 shrink-0 px-stack' })}><RowChevron className="rotate-180" /></Link>
        <div className="min-w-0"><h1 className="text-md font-bold">{t('programsTitle')}</h1>
          {!loading && !error && <p className="text-xs text-muted">{phone('count', { count: formatNumber(filterPrograms(templates, 'mine').length, locale) })}</p>}
        </div>
      </div>
    </>, titleTarget)}
    <PageBarActions>
      <Button variant="secondary" className="hidden min-h-12 rounded-full px-stack text-xs md:inline-flex" onClick={() => setGeneratorRequest(value => value + 1)}>
        <KoTemplate aria-hidden className="size-4" />{t('programAskKo')}</Button>
      <Button variant="secondary" className="min-h-12 rounded-full px-stack text-xs max-md:hidden" onClick={() => setPicking(true)}>
        <KoPlayers aria-hidden className="size-4" />{t('programForPlayer')}</Button>
      <Button disabled={disabled} block={false} aria-label={t('programNew')} className="max-md:min-w-12 max-md:px-stack!" onClick={onCreate}>
        <KoPlus aria-hidden className="size-4 max-md:text-on-lime!" /><span className="max-md:sr-only">{t('programNew')}</span></Button>
      <PageBarMenu>
        <Button variant="ghost" onClick={() => setGeneratorRequest(value => value + 1)}>{t('programAskKo')}</Button>
        <Button variant="ghost" onClick={() => setPicking(true)}>{t('programForPlayer')}</Button>
        <Button variant="ghost" aria-pressed={tab === 'assigned'} onClick={() => setTab(tab === 'assigned' ? 'mine' : 'assigned')}>{label(tabs[2])}</Button>
      </PageBarMenu>
    </PageBarActions>
    <Segmented aria-label={t('programsTitle')} className="w-fit max-w-full max-md:hidden" value={tab}
      options={[{ value: tabs[0].id, label: label(tabs[0]) }, { value: tabs[1].id, label: label(tabs[1]) }, { value: tabs[2].id, label: label(tabs[2]) }]}
      onChange={value => { const next = tabs.find(item => item.id === value); if (next) setTab(next.id); }} />
    <div className="flex max-w-full items-center gap-inline overflow-x-auto md:hidden">
      {tabs.slice(0, 2).map(item => <Button key={item.id} variant="ghost" block={false} aria-pressed={tab === item.id}
        className="shrink-0 whitespace-nowrap bg-surface px-stack text-xs text-muted aria-pressed:bg-surface-raised aria-pressed:font-bold aria-pressed:text-ink" onClick={() => setTab(item.id)}>
        {item.id === 'ready' ? phone('ready') : t(item.label)}{!loading && !error && <> {formatNumber(filterPrograms(templates, item.id).length, locale)}</>}
      </Button>)}
    </div>
    {(createError || busy.length > 0) && <p role={createError ? 'alert' : 'status'} className="text-sm text-muted">{createError || t('savingChanges')}</p>}
    {loading ? <LoadingState variant="cards" /> : error ? <div role="alert" className="glass rounded-card p-card">
      <p>{error}</p><Button variant="secondary" onClick={onRetry}>{t('tryAgain')}</Button>
    </div> : <>
      {!visible.length && <p className="glass rounded-card p-card text-sm text-muted">{t('programEmpty')}</p>}
      <ul className="grid grid-cols-1 gap-card-gap max-md:grid-cols-1! min-[760px]:grid-cols-2 @min-[700px]:grid-cols-3 @min-[1000px]:grid-cols-4">
        {visible.map(template => <WorkspaceProgramCard key={template.id} template={template} error={errors[`program-${template.id}`]}
          busy={busy.includes(`program-${template.id}`)} onOpen={actions(template).onOpen} onCopyAndEdit={actions(template).onCopyAndEdit} onAssign={actions(template).onAssign} onRetry={onRetry} />)}
      </ul>
    </>}
    {picking && <PlayerPicker onClose={() => setPicking(false)} />}
    {generatorRequest > 0 && <Generator request={generatorRequest} />}
  </div>;
}
