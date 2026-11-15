'use client';

import { useEffect, useRef } from 'react';
import { Check, Dumbbell, LoaderCircle } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { messages } from '../messages';
import type { CompletionStage } from '../wizard';

export function IntakeMoment({ stage, captainName, onStart }: {
  stage: 'welcome' | CompletionStage;
  captainName?: string;
  onStart: () => void;
}) {
  const t = useT(messages);
  const heading = useRef<HTMLHeadingElement>(null);
  const Icon = stage === 'success' ? Check : stage === 'preparing' ? LoaderCircle : Dumbbell;
  useEffect(() => { heading.current?.focus(); }, [stage]);
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
