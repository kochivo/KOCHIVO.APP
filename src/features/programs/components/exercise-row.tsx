'use client';

import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseMediaUrl } from '@/core/storage';
import { exerciseName } from '@/lib/display-name';
import { formatNumber } from '@/lib/format';
import { Stepper } from '@/ui';
import { ExerciseImage } from '@/ui/exercise-image';
import { messages } from '../messages';
import { exerciseSummary } from '../summary';
import type { DraftExercise, ExercisePatch } from '../types';
import { BuilderMenu } from './builder-menu';
import { restText } from './builder-fields';
import { RepsSheet } from './reps-sheet';
import { RestSheet } from './rest-sheet';
import { RirSheet } from './rir-sheet';

export function ExerciseRow({ row, first, last, onLink, onMove, onDelete, onUpdate }: {
  row: DraftExercise; first: boolean; last: boolean; onLink: () => void;
  onMove: (delta: -1 | 1) => void; onDelete: () => void;
  onUpdate: (patch: ExercisePatch) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [sheet, setSheet] = useState<'reps' | 'rest' | 'rir' | null>(null);
  const name = (row.library && exerciseName(row.library, locale)) || t('exerciseUnavailable');
  const position = formatNumber(row.position, locale);
  const linked = row.superset_group !== null;
  const repsId = `reps-${row.id}`;
  const restId = `rest-${row.id}`;
  const rirId = `rir-${row.id}`;
  const reps = row.reps_max === null ? t('failure') : row.reps_min === row.reps_max ? formatNumber(row.reps_min, locale)
    : t('repsRange', { min: formatNumber(row.reps_min, locale), max: formatNumber(row.reps_max, locale) });
  const field = 'recessed glass-strong flex min-h-28 min-w-0 flex-col items-center justify-center gap-3 rounded-control p-3 [&>div]:w-full [&_output]:text-2xl';
  return <article className={`glass space-y-4 rounded-card border border-line p-4 ${linked ? 'border-s-4 border-s-lime' : ''}`}>
    <div className="flex items-start gap-3">
      {row.library?.media_path && <ExerciseImage src={exerciseMediaUrl(row.library.media_path)} alt="" width={48} height={48} />}
      <div className="min-w-0 flex-1 space-y-2">
        <h3 className="break-words font-bold"><span className="me-2 tabular-nums text-muted">{position}</span><bdi>{name}</bdi></h3>
        <p className="text-sm tabular-nums text-muted">{exerciseSummary(row, locale)}</p>
        {linked && <span className="glass-raised inline-flex rounded-chip px-3 py-1 text-xs">{t('superset')}</span>}
      </div>
      <BuilderMenu id={`exercise-menu-${row.id}`} fallbackId={`day-title-${row.day_id}`} label={t('exerciseOptions', { name, position })} name={name} onDelete={onDelete}
        actions={[
          { label: t('moveUp', { v0: name, v1: position }), disabled: first, onClick: () => onMove(-1) },
          { label: t('moveDown', { v0: name, v1: position }), disabled: last, onClick: () => onMove(1) },
          { label: t(linked ? 'unlink' : 'linkNext'), disabled: last && !linked, onClick: onLink },
        ]} />
    </div>
    <div className="@container"><div className="grid grid-cols-2 gap-3 @md:grid-cols-4 [&_bdi]:whitespace-nowrap">
      <div className={field}><Stepper size="compact" label={t('sets')} controlLabel={t('sets2', { v0: name, v1: position })}
        format={value => formatNumber(value, locale)} value={row.sets} min={1} max={20} step={1} onChange={sets => onUpdate({ sets })} /></div>
      <button id={repsId} type="button" className={field} aria-haspopup="dialog" aria-label={`${t('reps')}: ${name}, ${position}`}
        onClick={() => setSheet('reps')}><span className="text-xs text-muted">{t('reps')}</span><bdi className="text-2xl font-bold tabular-nums">{reps}</bdi></button>
      <button id={restId} type="button" className={field} aria-haspopup="dialog" aria-label={`${t('rest')}: ${name}, ${position}`}
        onClick={() => setSheet('rest')}><span className="text-xs text-muted">{t('rest')}</span><bdi className="text-2xl font-bold tabular-nums">{restText(row.rest_seconds, locale)}</bdi></button>
      <button id={rirId} type="button" className={field} aria-haspopup="dialog" aria-label={t('rirLabel', { name, position })}
        onClick={() => setSheet('rir')}><span className="text-xs text-muted">{t('rir')}</span>
        <bdi className="text-2xl font-bold tabular-nums">{row.rir == null ? t('noRir') : formatNumber(row.rir, locale)}</bdi></button>
    </div>
    </div>
    {sheet === 'reps' && <RepsSheet row={row} openerId={repsId} onClose={() => setSheet(null)} onUpdate={onUpdate} />}
    {sheet === 'rest' && <RestSheet value={row.rest_seconds} openerId={restId} onClose={() => setSheet(null)} onChange={rest_seconds => onUpdate({ rest_seconds })} />}
    {sheet === 'rir' && <RirSheet value={row.rir} openerId={rirId} onClose={() => setSheet(null)} onChange={rir => onUpdate({ rir })} />}
  </article>;
}
