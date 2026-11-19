import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import type { PlayerFile } from '@/features/player-file';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { factValue, optionLabel } from './player-file-format';

export function PlayerFileSummary({ file: { facts }, locale }: { file: PlayerFile; locale: Locale }) {
  const t = createT(messages, locale);
  return <span className="flex flex-wrap items-center gap-inline text-xs">
    <bdi dir="ltr">{factValue('age', facts.age?.value, locale)}</bdi>
    <bdi dir="ltr">{factValue('height', facts.height?.value, locale)}</bdi>
    <bdi dir="ltr">{t('weightArrow', { weight: factValue('weight', facts.weight?.value, locale),
      target: factValue('targetWeight', facts.targetWeight?.value, locale) })}</bdi>
    <bdi dir="ltr">{t('schedule', { n: facts.trainingDays?.value.length ?? 0, days: facts.trainingDays ? formatNumber(facts.trainingDays.value.length, locale) : t('unavailable'),
      minutes: factValue('sessionMinutes', facts.sessionMinutes?.value, locale) })}</bdi>
    {facts.injuries?.value.filter(value => value !== 'none').map(value =>
      <span key={value} className="rounded-control bg-warn-soft px-inline py-inline text-warn">{optionLabel(value, locale)}</span>)}
  </span>;
}
