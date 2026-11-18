'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Check, Dumbbell, LoaderCircle } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { messages } from '../messages';
import type { CompletionStage } from '../wizard';
import { messages as v6Messages } from '../v6-messages';

export function IntakeMoment({ stage, captainName, onStart, workspace = false }: {
  stage: 'welcome' | CompletionStage;
  captainName?: string;
  onStart: () => void;
  workspace?: boolean;
}) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const heading = useRef<HTMLHeadingElement>(null);
  const Icon = stage === 'success' ? Check : stage === 'preparing' ? LoaderCircle : Dumbbell;
  useEffect(() => { heading.current?.focus(); }, [stage]);
  if (workspace && stage === 'welcome') return <main className="mx-auto flex min-h-[calc(100dvh-var(--safe-top)-var(--spacing-stack))] max-w-lg flex-col gap-section px-page-x pt-stack pb-[max(var(--safe-bottom),var(--spacing-card))]">
    <div aria-hidden className="grid grid-cols-3 gap-inline"><div className="h-1 rounded-full bg-lime" />
      <div className="h-1 rounded-full bg-line" /><div className="h-1 rounded-full bg-line" />
    </div>
    <section className="space-y-stack pt-section">
      <div className="glass cut-corner-sm grid size-12 place-items-center rounded-control"><Image src="/brand/logo-compact.png" alt="" width={32} height={32} /></div>
      <h1 ref={heading} tabIndex={-1} className="text-h font-extrabold outline-none">
        {captainName ? v6t('welcomeCoach', { name: captainName }) : t('coachIsWaiting')}
      </h1>
      <p className="text-sm text-muted">{v6t('intro')}</p>
      <p className="text-xs text-muted">{t('onlyYourCoachCanSeeYourAnswers')}</p>
    </section>
    <Button size="lg" className="mt-auto w-full" onClick={onStart}>{t('letsStart')}</Button>
  </main>;
  return (
    <main className="mx-auto flex min-h-[85dvh] w-full max-w-lg flex-col justify-center gap-section px-page-x py-section text-start">
      <section key={stage} className="glass-strong enter space-y-section rounded-card p-section motion-reduce:animate-none" aria-busy={stage === 'preparing'}>
        <div className="flex size-20 items-center justify-center rounded-card bg-lime-soft text-lime">
          <Icon aria-hidden className={`size-10 ${stage === 'preparing' ? 'animate-spin motion-reduce:animate-none' : ''}`} />
        </div>
        {stage === 'welcome' && captainName && <p className="text-lg text-lime">{captainName}</p>}
        <h1 ref={heading} tabIndex={-1} className="text-4xl leading-snug font-extrabold outline-none">
          {stage === 'welcome' ? t('coachIsWaiting') : stage === 'preparing' ? t('preparingYourPlan') : t('coachWillSendYourPlan')}
        </h1>
        <p className="text-sm leading-relaxed text-muted">{t('onlyYourCoachCanSeeYourAnswers')}</p>
      </section>
      {stage === 'welcome' && <Button size="lg" className="min-h-14 w-full" onClick={onStart}>{t('letsStart')}</Button>}
    </main>
  );
}
