import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { exerciseName } from '@/lib/display-name';
import { formatNumber } from '@/lib/format';
import { exerciseMediaUrl } from '@/core/storage/media-url';
import { ExerciseImage } from '@/ui/exercise-image';
import type { ProgramSummaryExercise } from './player-program-model';
import { messages } from './player-program-messages';

export function ProgramPrescriptionRow({ row, locale }: { row: ProgramSummaryExercise; locale: Locale }) {
  const t = createT(messages, locale), n = (value: number) => formatNumber(value, locale);
  const reps = (min: number, max: number | null) => max === null ? t('failure') : max === min ? n(min) : `${n(min)}–${n(max)}`;
  const prescription = row.set_plan?.length
    ? row.set_plan.map(set => reps(set.reps_min, set.reps_max)).join(' · ')
    : reps(row.reps_min, row.reps_max);
  return <li className="flex items-center gap-stack border-t border-line-soft py-stack first:border-0">
    {row.library?.media_path && <ExerciseImage src={exerciseMediaUrl(row.library.media_path)} alt="" width={44} height={44} />}
    <div className="min-w-0 flex-1">
      <h3 className="break-words text-sm font-semibold">{row.library ? exerciseName(row.library, locale) : t('unavailableExercise')}</h3>
      <p className="mt-inline text-xs text-muted"><bdi dir="ltr">{n(row.sets)} × {prescription}</bdi>
        {row.rest_seconds != null && <> · {t('rest', { n: row.rest_seconds, seconds: n(row.rest_seconds) })}</>}
      </p>
    </div>
  </li>;
}
