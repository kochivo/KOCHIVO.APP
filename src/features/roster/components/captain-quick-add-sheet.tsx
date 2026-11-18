'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { LoadingState } from '@/ui/loading-state';
import { Button } from '@/ui/button';
import { KoBilling } from '@/ui/icons/ko-billing';
import { KoForms } from '@/ui/icons/ko-forms';
import { KoInvite } from '@/ui/icons/ko-invite';
import { KoMealPlans } from '@/ui/icons/ko-meal-plans';
import { KoPlayers } from '@/ui/icons/ko-players';
import { KoTemplate } from '@/ui/icons/ko-template';
import { frameMessages } from './captain-frame-messages';
import { phoneMessages } from './captain-phone-messages';
import type { CaptainFrameData } from './captain-frame-data';
import { isQuickAddTarget } from './captain-quick-add-targets';
import type { QuickAddTarget } from './captain-quick-add-targets';

const actions = [
  { label: 'addPlayer', href: '/captain/players/new', icon: KoPlayers, primary: true },
  { label: 'payment', href: '/captain/billing', icon: KoBilling },
  { label: 'program', href: '/captain/templates', icon: KoTemplate },
  { label: 'mealPlan', href: '/captain/library/meal-plans', icon: KoMealPlans },
  { label: 'assessment', icon: KoForms },
  { label: 'invite', href: '/captain/join', icon: KoInvite },
] as const;
const Assessment = dynamic(() => import('@/features/forms').then(module => module.RequestManager), {
  loading: () => <LoadingState />,
});
const tile = 'press flex min-h-[84px] flex-col items-center justify-center gap-inline rounded-card border px-inline text-center text-row focus-visible:ring-2 focus-visible:ring-lime';
const secondary = 'border-line bg-ink/5 text-ink';

export function CaptainQuickAddSheet({ onClose, players, onAction }: {
  onClose: () => void; players: CaptainFrameData['players']; onAction: (target: QuickAddTarget) => void;
}) {
  const t = useT(phoneMessages);
  const frame = useT(frameMessages);
  const locale = useLocale();
  const [assessment, setAssessment] = useState(false);
  const [playerId, setPlayerId] = useState<string>();
  const title = t(assessment ? 'assessment' : 'chooseAction');
  return <ResponsiveDialog modal aria-label={title} fallbackId="captain-quick-add" openerId="captain-quick-add" onDismiss={onClose}
    className="sheet fixed inset-x-page-x bottom-[calc(5.5rem+var(--safe-bottom))] top-auto m-0 max-h-[75dvh] w-auto max-w-none overflow-y-auto rounded-card border border-line p-card text-ink backdrop:bg-bg/80! backdrop:backdrop-blur-none!">
    <div aria-hidden className="mx-auto h-1 w-10 rounded-full bg-muted/40" />
    <header className="flex items-center justify-between gap-inline">
      <h2 className="text-title font-bold">{title}</h2>
      <button type="button" onClick={onClose} aria-label={frame('close')} className="press grid min-h-12 min-w-12 cursor-pointer place-items-center rounded-control focus-visible:ring-2 focus-visible:ring-lime">
        <X className="size-5" aria-hidden />
      </button>
    </header>
    {assessment ? playerId ? <Assessment playerId={playerId} locale={locale} /> : <div className="grid gap-stack">
      <p className="text-sm text-muted">{players?.length ? t('choosePlayer') : players ? t('noPlayers') : frame('unavailable')}</p>
      {players?.map(player => <Button key={player.id} variant="secondary" onClick={event => {
        event.currentTarget.closest('dialog')?.querySelector<HTMLButtonElement>('header button')?.focus();
        setPlayerId(player.id);
      }}>{player.name}</Button>)}
    </div> : <div className="grid grid-cols-2 gap-inline">
      {actions.map(({ label, icon: Icon, ...action }) => 'href' in action
        ? <Link key={label} href={action.href} prefetch={false} onNavigate={() => {
          if (isQuickAddTarget(action.href)) onAction(action.href);
          onClose();
        }}
          className={`${tile} ${'primary' in action ? 'border-lime bg-lime-soft font-bold text-lime' : secondary}`}>
          <Icon className="size-6" aria-hidden />{t(label)}
        </Link>
        : <button key={label} type="button" onClick={event => {
          event.currentTarget.closest('dialog')?.querySelector<HTMLButtonElement>('header button')?.focus();
          setAssessment(true);
        }} className={`${tile} ${secondary} cursor-pointer`}>
          <Icon className="size-6" aria-hidden />{t(label)}
        </button>)}
    </div>}
  </ResponsiveDialog>;
}
