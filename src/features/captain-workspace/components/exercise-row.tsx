import { Dumbbell } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { exerciseMediaUrl } from '@/core/storage/media-url';
import type { DraftExercise } from '@/features/programs';
import { exerciseName } from '@/lib/display-name';
import { formatNumber } from '@/lib/format';
import { ExerciseImage } from '@/ui/exercise-image';
import { messages } from '../messages';
import { exerciseLabel } from '../exercise-label';

export function ExerciseRow({ row, locale }: { row: DraftExercise; locale: Locale }) {
  const t = createT(messages, locale);
  const n = (value: number) => formatNumber(value, locale);
  const name = (row.library && exerciseName(row.library, locale)) || t('exerciseUnavailable');
  const reps = row.reps_max === null ? t('failure') : row.reps_max === row.reps_min ? n(row.reps_min)
    : t('repRange', { min: n(row.reps_min), max: n(row.reps_max) });
  return <li className="glass flex items-center gap-stack rounded-card border border-line p-stack lg:gap-card-gap lg:p-card">
    {row.library?.media_path ? <ExerciseImage src={exerciseMediaUrl(row.library.media_path)} alt="" width={54} height={54} /> :
      <span aria-hidden className="glass-strong grid size-14 shrink-0 place-items-center rounded-control text-muted"><Dumbbell strokeWidth={1.5} className="size-6" /></span>}
    <div className="min-w-0 flex-1">
      <h4 className="break-words font-bold"><bdi>{name}</bdi></h4>
      <p className="mt-inline text-xs text-muted">{t('details', { muscle: exerciseLabel(row.library?.body_part, t), equipment: exerciseLabel(row.library?.equipment, t) })}</p>
      <bdi dir="ltr" className="whitespace-nowrap font-bold tabular-nums">{t('repScheme', { sets: n(row.sets), reps })}</bdi>
    </div>
  </li>;
}
