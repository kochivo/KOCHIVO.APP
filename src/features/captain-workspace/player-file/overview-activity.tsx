import { secondaryButtonClass as clickableClass } from '@/ui/secondary-button-class';
import Image from 'next/image';
import Link from 'next/link';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import type { FileActivity } from './load-activity';
import type { Profile } from './types';
import { v11Messages } from './v11-messages';
import { messages } from './messages';
import { ExerciseImage } from '@/ui/exercise-image';
import { exerciseMediaUrl } from '@/core/storage/media-url';
import { messages as setMessages } from '@/lib/training/messages';

export function OverviewActivity({ profile, activity, playerId, locale }: { profile: Profile; activity: FileActivity; playerId: string; locale: Locale }) {
  const t = createT(v11Messages, locale), ft = createT(messages, locale);
  const st = createT(setMessages, locale);
  const photos = [...profile.checkIns].sort((a, b) => a.weekStart.localeCompare(b.weekStart)).flatMap(row => row.photos[0] ? [{ url: row.photos[0], date: row.weekStart }] : []);
  const first = photos[0], last = photos.at(-1);
  const selected = first ? first === last ? [first] : [first, last].filter(item => item !== undefined) : [];
  const exercises = new Map<string, FileActivity['sets']>();
  for (const set of activity.sets) exercises.set(set.exercise_id, [...(exercises.get(set.exercise_id) ?? []), set]);
  return <div className="grid gap-stack min-[760px]:grid-cols-2">
    <section className="glass rounded-card border border-line-soft p-card">
      <div className="mb-stack flex items-center justify-between"><h2 className="text-sm font-semibold">{t('photos')}</h2><Link href={`/captain/players/${playerId}/checkins`} className={`${clickableClass} inline-flex min-h-12 items-center text-xs text-lime`}>{t('all')}</Link></div>
      {selected.length ? <div className="grid grid-cols-2 gap-inline">{selected.map(photo => <figure key={photo.date}>
        <Image src={photo.url} alt={t('photos')} width={240} height={320} unoptimized className="aspect-[3/4] w-full rounded-control object-cover" />
        <figcaption className="mt-inline text-xs text-muted">{formatDateAr(photo.date, { day: 'numeric', month: 'long' }, locale)}</figcaption>
      </figure>)}</div> : <p className="text-sm text-muted">{ft('noPhotos')}</p>}
    </section>
    <section className="glass rounded-card border border-line-soft p-card">
      <div className="mb-stack flex flex-wrap items-center justify-between gap-inline"><h2 className="text-sm font-semibold">{t('lastWorkout')}</h2>
        {activity.last && <span className="text-xs text-lime">{activity.last.program_days?.title} · {formatDateAr(activity.last.training_date, { day: 'numeric', month: 'long' }, locale)}</span>}
      </div>
      {exercises.size ? [...exercises].map(([id, sets]) => <div key={id} className="flex items-center gap-stack border-t border-line-soft py-stack first:border-0">
        {sets[0]?.exercises?.media_path && <ExerciseImage src={exerciseMediaUrl(sets[0].exercises.media_path)} alt="" width={44} height={44} />}
        <div className="min-w-0 flex-1"><h3 className="text-sm">{locale === 'en' ? sets[0]?.exercises?.name_en : sets[0]?.exercises?.name_ar}</h3>
          {sets.filter(set => (set.drop_index ?? 0) === 0).map((set, index) => <div key={index} className="mt-inline text-xs text-muted">
            <p><bdi>{formatNumber(set.weight_kg ?? 0, locale)} × {formatNumber(set.reps ?? 0, locale)}</bdi> {ft('kg')}</p>
            {sets.some(row => row.program_exercise_id === set.program_exercise_id && row.set_index === set.set_index && row.drop_index > 0) &&
              <p className="text-warn">{st('drops', { values: sets.filter(row => row.program_exercise_id === set.program_exercise_id && row.set_index === set.set_index && row.drop_index > 0)
                .sort((a, b) => a.drop_index - b.drop_index).map(row => `${formatNumber(row.weight_kg ?? 0, locale)} × ${formatNumber(row.reps ?? 0, locale)}`).join('، ') })}</p>}
          </div>)}</div>
      </div>) : <p className="text-sm text-muted">{t('noWorkout')}</p>}
    </section>
  </div>;
}
