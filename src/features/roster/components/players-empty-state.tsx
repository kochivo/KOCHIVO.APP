'use client';

import { Plus, UserPlus } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { messages } from '../messages';

export function PlayersEmptyState({ demo, onInvite }: { demo: boolean; onInvite: () => void }) {
  const t = useT(messages);
  const steps = [t('stepInvite'), t('stepIntake'), t('stepAssign')];

  return <div data-players-empty className="glass flex min-h-[clamp(24rem,calc(100svh-16rem),40rem)] items-center justify-center rounded-card px-5 py-8 text-center sm:px-8">
    <div className="flex w-full max-w-lg flex-col items-center gap-5">
      <span aria-hidden className="grid size-12 place-items-center rounded-2xl border border-lime/15 bg-lime-soft text-lime">
        <UserPlus className="size-6" />
      </span>
      <div className="space-y-2">
        <h2 className="text-balance text-2xl leading-snug font-bold text-ink sm:text-3xl">
          {demo ? t('noDemoDataYet') : t('noPlayersYetSendYourFirstInvite')}
        </h2>
        <p className="text-sm leading-6 text-muted">
          {demo ? t('invitesAreDisabledInTheDemo') : t('startWithAnInviteLink')}
        </p>
      </div>
      {!demo && <ol className="flex max-w-full flex-col gap-2.5 text-start text-sm text-muted">
        {steps.map((step, index) => <li key={step} className="flex items-start gap-3">
          <span aria-hidden className="w-4 shrink-0 pt-0.5 font-display text-xs font-medium text-faint tabular-nums">{index + 1}</span>
          <span className="min-w-0 leading-6">{step}</span>
        </li>)}
      </ol>}
      <Button variant="secondary" onClick={onInvite}
        className="min-h-12 px-6 font-bold [--glass-border:var(--selected-border)] transition-colors hover:border-lime/60 hover:text-lime-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-ink motion-reduce:transition-none">
        <Plus aria-hidden className="size-4 shrink-0" />
        {demo ? t('invitesAreDisabledInTheDemo') : t('newPlayer')}
      </Button>
    </div>
  </div>;
}
