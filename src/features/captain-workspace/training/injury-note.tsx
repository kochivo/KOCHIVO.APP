'use client';

import { TriangleAlert } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import type { LibraryExercise } from '@/features/programs';
import { optionLabel } from '../components/player-file-format';
import { injuryOverlap, swapSuggestion } from './fit-checks';
import type { TaggedExercise } from './fit-checks';
import { messages } from './messages';
import { Button } from '@/ui/button';

export function InjuryNote({ exerciseId, injuries, candidates, onReplace }: {
  exerciseId: string; injuries: readonly string[]; candidates: readonly TaggedExercise[];
  onReplace: (library: LibraryExercise) => void;
}) {
  const t = useT(messages), locale = useLocale();
  const source = candidates.find(candidate => candidate.exercise_id === exerciseId);
  const overlap = injuryOverlap(source?.stress, injuries);
  if (!overlap.length) return null;
  const suggestion = swapSuggestion(exerciseId, injuries, candidates)[0];
  const name = suggestion && (locale === 'ar' ? suggestion.library.name_ar || suggestion.library.name_en : suggestion.library.name_en);
  return <div className="mx-card-gap mb-stack flex flex-wrap items-center gap-inline rounded-control bg-warn/10 px-stack py-inline text-xs text-warn">
    <TriangleAlert aria-hidden className="size-4 shrink-0" />
    <span>{t('injuryWarning', { injury: overlap.map(injury => optionLabel(injury, locale)).join(' · ') })}</span>
    {suggestion && <>
      <span className="min-w-0 break-words">{t('swapSuggestion', { name: name ?? '' })}</span>
      <Button type="button" variant={'secondary'} block={false} className={"ms-auto min-h-12 px-page-x text-lime"}
        onClick={() => onReplace(suggestion.library)}>{t('swap')}</Button>
    </>}
  </div>;
}
