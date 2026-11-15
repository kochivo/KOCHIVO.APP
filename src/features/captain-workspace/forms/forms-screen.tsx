'use client';

import { useCallback, useState } from 'react';
import { useResource } from '@/core/resource';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { PlayerForm } from './adapter';
import { listPlayerForms } from './data/actions';
import type { ReviewAction } from './review';
import type { FormsMutation } from './review';
import { createReviewLock } from './review-lock';
import type { SignPhotos } from './form-photos';
import { FormDetail } from './form-detail';
import { FormsTimeline } from './forms-timeline';
import { FormsState } from './forms-state';
import { messages } from './messages';
import { AssessmentScheduleEntry } from '@/features/forms';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function FormsScreen({ playerId, locale, review, sign }: {
  playerId: string; locale: Locale; review: ReviewAction; sign: SignPhotos;
}) {
  const t = createT(messages, locale);
  const load = useCallback(async () => {
    const result = await listPlayerForms(playerId);
    if (!result.data || result.error) throw new Error(result.error);
    return result.data;
  }, [playerId]);
  const resource = useResource<PlayerForm[]>(`player-forms:${playerId}:${locale}`, load);
  const [selectedId, setSelectedId] = useState<string>();
  const [lock] = useState(createReviewLock);
  const [reviewing, setReviewing] = useState(false);
  const mutate: FormsMutation = (next, commit) => lock.run(async () => {
    setReviewing(true);
    try { return await resource.mutate(next, commit); }
    finally { setReviewing(false); }
  });
  if (!resource.data) {
    const state = <FormsState kind={resource.status === 'error' ? 'error' : 'loading'} locale={locale} retry={() => void resource.retry()} />;
    return captainWorkspaceEnabled() ? <section className="space-y-card-gap"><AssessmentScheduleEntry playerId={playerId} locale={locale} />{state}</section> : state;
  }
  const selected = resource.data.find(form => form.snapshot.source.id === selectedId) ?? resource.data[0];
  const select = (form: PlayerForm) => {
    if (lock.pending()) return;
    setSelectedId(form.snapshot.source.id);
    requestAnimationFrame(() => {
      const detail = document.getElementById('player-form-detail');
      detail?.focus({ preventScroll: true });
      detail?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };
  return <section aria-label={t('title')} className="space-y-card-gap">
    {captainWorkspaceEnabled() && <AssessmentScheduleEntry playerId={playerId} locale={locale} />}
    {resource.status === 'error' && <FormsState kind="error" locale={locale} retry={() => void resource.retry()} />}
    <div className="grid items-start gap-section lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.8fr)]">
      <FormsTimeline forms={resource.data} selectedId={selected?.snapshot.source.id} locale={locale} onSelect={select} disabled={reviewing} showLegacyReminder={!captainWorkspaceEnabled()} />
      {selected && <div className={selectedId ? 'min-w-0' : 'min-w-0 hidden lg:block'}>
        <FormDetail key={selected.snapshot.source.id} form={selected} playerId={playerId} locale={locale}
          mutate={mutate} review={review} sign={sign} />
      </div>}
      {selected && !selectedId && <p className="text-sm text-muted lg:hidden">{t('choose')}</p>}
    </div>
  </section>;
}
