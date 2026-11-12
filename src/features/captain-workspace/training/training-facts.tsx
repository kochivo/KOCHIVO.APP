import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import type { PlayerFile } from '@/features/player-file';
import { FactRow } from '@/ui/fact-row';
import { formatNumber } from '@/lib/format';
import { factValue, optionLabel } from '../components/player-file-format';
import { PlayerFilePanel } from '../components/player-file-panel';
import type { Profile } from '../player-file/types';
import { messages } from './messages';

export function TrainingFacts({ profile, file, locale }: { profile: Profile; file: PlayerFile; locale: Locale }) {
  const t = createT(messages, locale);
  const { facts } = file;
  const target = facts.targetWeight?.value, initial = profile.intake?.weightKg;
  const goal = target == null || initial === undefined ? factValue('targetWeight', undefined, locale)
    : t(target < initial ? 'lose' : target > initial ? 'gain' : 'maintain');
  const injuries = facts.injuries?.value.filter(value => value !== 'none') ?? [];
  const n = (value: number | undefined) => value === undefined ? factValue('age', undefined, locale) : formatNumber(value, locale);
  return <aside className="min-w-0 space-y-3 min-[1001px]:sticky min-[1001px]:top-[75px]">
    <section className="glass-strong rounded-card border border-line-soft px-5 py-[18px]">
      <h2 className="mb-2 font-display text-[19px] font-semibold">{t('facts')}</h2>
      <dl>
        <FactRow label={t('goal')}>{goal}</FactRow>
        <FactRow label={t('weight')}><bdi className="font-display font-extrabold">{factValue('weight', facts.weight?.value, locale)}</bdi></FactRow>
        <FactRow label={t('heightAge')}><bdi className="font-display font-extrabold">{n(facts.height?.value)} · {n(facts.age?.value)}</bdi></FactRow>
        <FactRow label={t('experience')}>{facts.experience ? optionLabel(facts.experience.value, locale) : factValue('experience', undefined, locale)}</FactRow>
        <FactRow label={t('trainingDays')}>{factValue('trainingDays', facts.trainingDays?.value, locale)}</FactRow>
        <FactRow label={t('duration')}><bdi className="font-display font-extrabold">{facts.sessionMinutes ? t('minutes', { n: n(facts.sessionMinutes.value) }) : factValue('sessionMinutes', undefined, locale)}</bdi></FactRow>
        <FactRow label={t('injuries')}><span className={injuries.length ? 'text-warn' : 'text-faint'}>{factValue('injuries', facts.injuries?.value, locale)}</span></FactRow>
        <FactRow label={t('location')}>{factValue('note', undefined, locale)}</FactRow>
      </dl>
    </section>
    <details className="glass rounded-card border border-line-soft px-5 py-2">
      <summary className="flex min-h-12 cursor-pointer items-center text-xs text-muted">{t('details')}</summary>
      <PlayerFilePanel name={profile.name} file={file} locale={locale} initialWeight={initial} timezone={profile.timezone} />
    </details>
  </aside>;
}
