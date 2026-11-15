import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import { FactRow } from '@/ui/fact-row';
import { factValue, optionLabel, sourceLabel, factLabel } from '../components/player-file-format';
import { messages as workspaceMessages } from '../messages';
import { messages } from './messages';
import type { FileSummary, Profile } from './types';

export function OverviewFacts({ profile, summary, locale }: { profile: Profile; summary: FileSummary; locale: Locale }) {
  const t = createT(messages, locale), wt = createT(workspaceMessages, locale);
  const { facts, history } = summary.file;
  const n = (value: number | undefined) => value === undefined ? t('unavailable') : formatNumber(value, locale);
  const target = facts.targetWeight?.value;
  const initial = profile.intake?.weightKg;
  const goal = target == null || initial === undefined ? t('unavailable') : t(target < initial ? 'lose' : target > initial ? 'gain' : 'maintain');
  const conditions = [facts.injuries, facts.medical, facts.allergies].flatMap(fact => fact?.value ?? []).filter(key => key !== 'none');
  return <div className="space-y-card-gap">
    <section className="glass rounded-card border border-line-soft px-page-x py-page-y">
      <h2 className="mb-inline font-display text-title font-semibold">{t('facts')}</h2>
      <dl>
        <FactRow label={t('goal')}>{goal}{target != null && <> · {factValue('targetWeight', target, locale)}</>}</FactRow>
        <FactRow label={t('body')}><bdi className="font-semibold">{n(facts.weight?.value)} · {n(facts.height?.value)} · {n(facts.age?.value)}</bdi></FactRow>
        <FactRow label={t('experience')}>{facts.experience ? optionLabel(facts.experience.value, locale) : t('unavailable')}</FactRow>
        <FactRow label={t('trainingDays')}>{factValue('trainingDays', facts.trainingDays?.value, locale)} · {factValue('sessionMinutes', facts.sessionMinutes?.value, locale)}</FactRow>
        <FactRow label={t('health')}><span className={conditions.length ? 'text-warn' : 'text-faint'}>{conditions.length ? conditions.map(key => optionLabel(key, locale)).join(' · ') : t('none')}</span></FactRow>
        <FactRow label={t('sex')}>{factValue('sex', facts.sex?.value, locale)}</FactRow>
        {facts.waist && <FactRow label={t('waist')}>{factValue('waist', facts.waist.value, locale)}</FactRow>}
        <FactRow label={t('notes')}><span className="whitespace-pre-wrap">{facts.note?.value || t('none')}</span></FactRow>
      </dl>
    </section>
    {history.length > 0 && <section className="glass rounded-card border border-line-soft px-page-x py-page-y">
      <h2 className="mb-inline font-display text-title font-semibold">{t('history')}</h2>
      <ol>{[...history].sort((a, b) => b.source.at.localeCompare(a.source.at)).map(entry => <li key={`${entry.source.kind}-${entry.source.id}`} className="border-t border-line-soft py-stack first:border-0">
        <p className="text-sm">{sourceLabel(entry.source, locale, profile.timezone)}</p>
        <p className="mt-inline text-xs text-faint">{entry.first ? wt('firstData') : entry.changed.length ? wt('changedFacts', { facts: entry.changed.map(key => factLabel(key, locale)).join(' · ') }) : wt('unchanged')}</p>
      </li>)}</ol>
    </section>}
  </div>;
}
