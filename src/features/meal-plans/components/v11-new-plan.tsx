'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Pencil, Search } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button, buttonClass } from '@/ui/button';
import { KoPlus } from '@/ui/icons/ko-plus';
import { usePageBarTarget } from '@/ui/page-bar-slot';
import { RowChevron } from '@/ui/row-chevron';
import { PageBarActions } from '@/ui/page-bar-actions';
import { PageBarMenu } from '@/ui/page-bar-menu';
import { Segmented } from '@/ui/segmented';
import { messages } from './v11/messages';
import { filterMealPlans } from './v11/meal-library-model';
import type { MealLibraryPlan } from './v11/meal-library-model';
import { MealLibraryGrid } from './v11/meal-library-grid';
import { MealCreationDialog } from './v11/meal-creation-dialog';

const AssignDialog = dynamic(() => import('./v11-assign-dialog').then(module => module.V11AssignDialog));

export function V11NewPlan({ plans }: { plans?: MealLibraryPlan[] }) {
  const t = useT(messages), router = useRouter();
  const titleTarget = usePageBarTarget('title');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [assignment, setAssignment] = useState<{ planId?: string; opener: HTMLElement | null } | null>(null);
  const [creating, setCreating] = useState(false);
  const filtered = filterMealPlans(plans ?? [], search, filter);
  const filterOption = (value: keyof typeof filtered.counts) => ({
    value, label: t('filterCount', { label: t(value === 'unassigned' ? 'unassignedFilter' : value), n: filtered.counts[value] }),
  });
  const playerCount = new Set(plans?.flatMap(plan => plan.players.map(player => player.id))).size;
  const choices = (plans ?? []).map(({ id, title, kcal }) => ({ id, title, calories: kcal ?? undefined }));
  if (assignment?.planId) {
    const index = choices.findIndex(plan => plan.id === assignment.planId);
    if (index > 0) choices.unshift(...choices.splice(index, 1));
  }
  function openAssignment(planId?: string) {
    const active = document.activeElement;
    const menuTrigger = active?.closest('[data-page-bar-menu]')?.querySelector('summary');
    setAssignment({ planId, opener: menuTrigger ?? (active instanceof HTMLElement ? active : null) });
  }
  return <>
    {titleTarget && createPortal(<>
      <h1 className="text-base font-semibold max-md:hidden">{t('plans')}</h1>
      {plans && <p className="text-xs text-muted max-md:hidden">{t('librarySummary', {
        plans: t('librarySummaryPlans', { n: plans.length, plans: plans.length }),
        players: t('librarySummaryPlayers', { n: playerCount, players: playerCount }),
      })}</p>}
      <div className="flex items-center gap-stack md:hidden">
        <Link href="/captain" aria-label={t('back')} className={buttonClass({ variant: 'secondary', block: false, className: 'min-w-12 shrink-0 px-stack' })}><RowChevron className="rotate-180" /></Link>
        <div className="min-w-0"><h1 className="text-md font-bold">{t('plans')}</h1>
          {plans && <p className="text-xs text-muted">{t('phonePlanCount', { n: plans.length })}</p>}
        </div>
      </div>
    </>, titleTarget)}
    <PageBarActions>
      <Button id="v11-assign" onClick={() => openAssignment()} variant="secondary" block={false} className="max-md:hidden!">
        <Pencil aria-hidden className="size-4" />{t('writePlan')}
      </Button>
      <PageBarMenu><Button variant="ghost" onClick={() => openAssignment()}>{t('writePlan')}</Button></PageBarMenu>
      <Button id="meal-library-create" aria-label={t('newPlan')} onClick={() => setCreating(true)} block={false} className="max-md:min-w-12 max-md:px-stack!">
        <KoPlus aria-hidden className="size-5 max-md:text-on-lime!" /><span className="max-md:sr-only">{t('newPlan')}</span>
      </Button>
    </PageBarActions>
    {plans && <>
      <div className="flex flex-wrap items-center gap-inline">
        <label className="recessed flex min-h-12 w-full items-center gap-inline rounded-control border border-line px-stack focus-within:ring-2 focus-within:ring-lime min-[760px]:max-w-xs">
          <Search aria-hidden className="size-4 shrink-0 text-muted" />
          <input type="search" value={search} onChange={event => setSearch(event.target.value)}
            aria-label={t('findPlan')} placeholder={t('findPlan')} className="min-h-12 min-w-0 flex-1 bg-transparent text-row outline-none placeholder:text-muted" />
        </label>
        <Segmented phoneScroll aria-label={t('filterPlans')} value={filter} onChange={setFilter} className="max-w-full"
          options={[filterOption('all'), filterOption('assigned'), filterOption('unassigned')]} />
        <span className="ms-auto hidden text-xs text-muted xl:block">{t('recentlyEdited')}</span>
      </div>
      <MealLibraryGrid plans={filtered.plans} emptyLibrary={!plans.length} onAssign={openAssignment} onCreate={() => setCreating(true)} t={t} />
    </>}
    {creating && <MealCreationDialog plans={choices} onClose={() => setCreating(false)} />}
    {assignment && <AssignDialog plans={choices} onClose={() => {
      const opener = assignment.opener;
      setAssignment(null);
      router.refresh();
      requestAnimationFrame(() => { if (opener?.isConnected) opener.focus(); });
    }} />}
  </>;
}
