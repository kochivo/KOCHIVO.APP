'use client';

import { TriangleAlert } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import type { LibraryExercise } from '@/features/programs';
import { optionLabel } from '../components/player-file-format';
import { injuryOverlap, swapSuggestion } from './fit-checks';
import type { TaggedExercise } from './fit-checks';
import { messages } from './messages';

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
  return <div className="mx-[18px] mb-3 flex flex-wrap items-center gap-2 rounded-control bg-warn/10 px-3 py-2 text-xs text-warn">
    <TriangleAlert aria-hidden className="size-4 shrink-0" />
    <span>{t('injuryWarning', { injury: overlap.map(injury => optionLabel(injury, locale)).join(' · ') })}</span>
    {suggestion && <>
      <span className="min-w-0 break-words">{t('swapSuggestion', { name: name ?? '' })}</span>
      <button type="button" className="ms-auto min-h-12 rounded-full border border-line-soft px-4 text-lime"
        onClick={() => onReplace(suggestion.library)}>{t('swap')}</button>
    </>}
  </div>;
}
