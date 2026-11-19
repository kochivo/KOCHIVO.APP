import { getLocale, getT } from '@/core/i18n/server';
import { messages } from '../messages';

import type { ReactNode } from 'react';
import { GlassCard } from '@/ui';
import { formatNumber } from '@/lib/format';
import { allergyOptions, injuryOptions, medicalOptions, onboardingMessages } from '@/features/onboarding';
import { ageIn, pickedLabels, trainingDayKeys } from '../model';
import type { ProfileIntake } from '../types';
import { RemindButton } from './remind-button';

const experienceLabels = { new: 'justStarting', under_1y: 'lessThanAYear', '1_3y': 'message13Years', over_3y: 'over3Years' } as const;

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-inline"><dt className="text-xs text-muted">{label}</dt><dd className="font-bold">{children}</dd></div>;
}

export async function IntakeTab({ intake, today, playerId }: { intake: ProfileIntake | null; today: string; playerId: string }) {
  const [t, o, locale] = await Promise.all([getT(messages), getT(onboardingMessages), getLocale()]);
  if (!intake) return <RemindButton playerId={playerId} kind="intake" title={t('noIntakeTitle')} body={t('noIntakeBody')} label={t('remindPlayer')} />;
  const n = (value: number) => formatNumber(value, locale);
  const list = (labels: string[]) => labels.length ? labels.join(t('listSeparator')) : t('nothing');
  const experience = experienceLabels[intake.experience as keyof typeof experienceLabels];
  return (
    <div className="grid gap-card-gap lg:grid-cols-2">
      <GlassCard className="space-y-card-gap p-card">
        <h2 className="text-lg font-bold">{t('basics')}</h2>
        <dl className="grid grid-cols-2 gap-card-gap">
          <Fact label={t('age')}>{t('years', { n: ageIn(intake.birthYear, today), count: n(ageIn(intake.birthYear, today)) })}</Fact>
          <Fact label={t('sex')}>{o(intake.sex)}</Fact>
          <Fact label={t('height')}>{n(intake.heightCm)} {t('cm')}</Fact>
          <Fact label={t('weight')}>{n(intake.weightKg)} {t('kg')}</Fact>
          <Fact label={t('target')}>{intake.targetWeightKg === null ? t('dash') : `${n(intake.targetWeightKg)} ${t('kg')}`}</Fact>
          <Fact label={t('experience')}>{experience ? o(experience) : t('dash')}</Fact>
        </dl>
      </GlassCard>
      <GlassCard className="space-y-card-gap p-card">
        <h2 className="text-lg font-bold">{t('schedule')}</h2>
        <dl className="grid gap-card-gap">
          <Fact label={t('days')}>{list(trainingDayKeys(intake.trainingDays).map((day) => o(day)))}</Fact>
          <Fact label={t('sessionLength')}>{t('minutes', { n: intake.sessionMinutes, count: n(intake.sessionMinutes) })}</Fact>
        </dl>
      </GlassCard>
      <GlassCard className="space-y-card-gap p-card">
        <h2 className="text-lg font-bold">{t('health')}</h2>
        <dl className="grid gap-card-gap">
          <Fact label={t('injuries')}>{list(pickedLabels(intake.injuries, injuryOptions).map((key) => o(key)))}</Fact>
          <Fact label={t('medical')}>
            <span className={intake.medical.some((key) => key !== 'none') ? 'text-warn' : undefined}>
              {list(pickedLabels(intake.medical, medicalOptions).map((key) => o(key)))}
            </span>
          </Fact>
          <Fact label={t('allergies')}>{list(pickedLabels(intake.allergies, allergyOptions).map((key) => o(key)))}</Fact>
        </dl>
      </GlassCard>
      <GlassCard className="space-y-stack p-card">
        <h2 className="text-lg font-bold">{t('notes')}</h2>
        <p className="whitespace-pre-wrap text-muted">{intake.notes?.trim() || t('nothing')}</p>
      </GlassCard>
    </div>
  );
}
