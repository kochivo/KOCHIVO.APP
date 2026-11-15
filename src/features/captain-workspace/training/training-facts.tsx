'use client';

import { RowLink } from '@/ui/row-link';

import { useState } from 'react';
import { Check, ChevronDown, TriangleAlert } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import { useArabicStyle } from '@/core/i18n/client';
import type { Locale } from '@/core/i18n/locale';
import type { PlayerFile } from '@/features/player-file';
import type { DraftDay, ProgramDraft } from '@/features/programs';
import { formatNumber } from '@/lib/format';
import { factValue, optionLabel, weekdays } from '../components/player-file-format';
import { messages as workspaceMessages } from '../messages';
import type { Profile } from '../player-file/types';
import { checkDays, checkMinutes, injuryCount, selectedMinutes } from './fit-checks';
import type { TrainingContext } from './fit-checks';
import { messages } from './messages';
import { Button } from '@/ui/button';

export type TrainingPlayerFacts = TrainingContext & { profile: Pick<Profile, 'name' | 'intake'>; file: PlayerFile; today: string };
type Props = TrainingPlayerFacts & { locale: Locale; draft: ProgramDraft; day?: DraftDay };

export function TrainingFacts({ profile, file, locale, draft, day, fatPct, candidates, today }: Props) {
  const [expanded, setExpanded] = useState(false);
  const style = useArabicStyle();
  const t = createT(messages, locale, style), wt = createT(workspaceMessages, locale, style);
  if (!draft.player_id) return null;
  const intake = profile.intake;
  if (!intake) return <section className="glass-strong rounded-card border border-line-soft p-card">
    <h2 className="font-display text-lg font-semibold">{profile.name}</h2>
    <p className="text-sm text-muted">{t('missingIntake')}</p>
    <RowLink href={`/captain/players/${draft.player_id}`}>{t('fullFile')}</RowLink>
  </section>;
  const injuries = intake.injuries.filter(value => value !== 'none');
  const allergies = intake.allergies.filter(value => value !== 'none');
  const weight = file.facts.weight?.value ?? intake.weightKg;
  const target = file.facts.targetWeight?.value ?? intake.targetWeightKg;
  const goal = target === null ? factValue('targetWeight', undefined, locale)
    : t(target < intake.weightKg ? 'lose' : target > intake.weightKg ? 'gain' : 'maintain');
  const n = (value: number) => formatNumber(value, locale);
  const minutes = day ? selectedMinutes(day) : null;
  const risk = injuryCount(day?.exercises.map(row => candidates.find(item => item.exercise_id === row.exercise_id)?.stress) ?? [], injuries);
  const count = draft.days.filter(item => !item.is_rest_day).length;
  const checks = [
    { key: 'days', ok: checkDays(count, intake.trainingDays), text: t('daysFit', { program: n(count), available: n(intake.trainingDays.length) }) },
    { key: 'minutes', ok: minutes !== null && checkMinutes(minutes, intake.sessionMinutes), text: minutes === null ? t('unknownEstimate')
      : t('minutesFit', { estimated: n(minutes), available: n(intake.sessionMinutes) }) },
    { key: 'injuries', ok: risk === 0, text: risk ? t('injuryFit', { n: n(risk) }) : t('injuryClear') },
  ];
  return <section className="glass-strong min-w-0 rounded-card border border-line-soft p-card">
    <div className="flex flex-wrap items-center gap-stack">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-semibold">{profile.name}</h2>
        <p className="text-xs text-muted">{factValue('age', Number(today.slice(0, 4)) - intake.birthYear, locale)} · {optionLabel(intake.sex, locale)} · {optionLabel(intake.experience, locale)}</p>
        <p className="mt-inline text-sm md:hidden"><bdi>{factValue('weight', weight, locale)} → {factValue('targetWeight', target, locale)}</bdi></p>
      </div>
      {injuries.map(injury => <span key={injury} className="rounded-full bg-warn/10 px-stack py-inline text-xs text-warn">{optionLabel(injury, locale)}</span>)}
      <RowLink href={`/captain/players/${draft.player_id}`}>{t('fullFile')}</RowLink>
      <Button type="button" aria-expanded={expanded} aria-controls={`player-facts-${draft.id}`} aria-label={t(expanded ? 'collapseFacts' : 'expandFacts')}
        onClick={() => setExpanded(value => !value)} variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center md:hidden"}>
        <ChevronDown aria-hidden className={`size-4 ${expanded ? 'rotate-180' : ''}`} />
      </Button>
    </div>
    <div id={`player-facts-${draft.id}`} className={`${expanded ? 'block' : 'hidden'} space-y-card-gap pt-card md:block`}>
      <dl className="grid grid-cols-2 gap-card-gap sm:grid-cols-4">
        {([
          ['height', factValue('height', intake.heightCm, locale)], ['weight', factValue('weight', weight, locale)],
          ['target', factValue('targetWeight', target, locale)], ['bodyFat', fatPct === null ? wt('unavailable') : t('fatValue', { n: n(fatPct) })],
        ] as const).map(([key, value]) => <div key={key}><dt className="text-xs text-muted">{t(key)}</dt>
          <dd className="mt-inline font-display text-xl font-extrabold"><bdi>{value}</bdi></dd></div>)}
      </dl>
      <p className="text-sm"><span className="text-muted">{t('goal')}</span> · {goal}</p>
      <div className="flex flex-wrap items-center gap-inline text-xs">
        <span className="text-muted">{t('trainingDays')}</span>
        {weekdays.map((key, index) => <span key={key} data-training-day={index} className={`rounded-full border px-stack py-inline ${intake.trainingDays.includes((index + 6) % 7) ? 'border-lime/30 bg-lime-soft text-lime' : 'border-line-soft text-faint'}`}>{wt(key)}</span>)}
        <span className="text-muted">{t('duration')} · {t('minutes', { n: n(intake.sessionMinutes) })}</span>
      </div>
      <dl className="space-y-inline text-sm">
        {!injuries.length && <div><dt className="inline text-muted">{t('injuries')}</dt><dd className="ms-inline inline">{t('noInjuries')}</dd></div>}
        <div><dt className="inline text-muted">{t('allergies')}</dt><dd className="ms-inline inline">{allergies.length ? allergies.map(value => optionLabel(value, locale)).join(' · ') : t('noAllergies')}</dd></div>
        <div><dt className="text-muted">{t('intakeNotes')}</dt><dd className="whitespace-pre-wrap break-words">{intake.notes || t('noNotes')}</dd></div>
      </dl>
      <div aria-live="polite" className="flex flex-wrap gap-inline border-t border-line-soft pt-stack">
        {checks.map(check => <span key={check.key} data-fit-check={check.key} className={`inline-flex items-center gap-inline rounded-full px-stack py-inline text-xs ${check.ok ? 'bg-lime-soft text-lime' : 'bg-warn/10 text-warn'}`}>
          {check.ok ? <Check aria-hidden className="size-3.5" /> : <TriangleAlert aria-hidden className="size-3.5" />}{check.text}
        </span>)}
      </div>
    </div>
  </section>;
}
