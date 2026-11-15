'use client';

import { useT } from '@/core/i18n/client';
import { Disclosure } from '@/ui/disclosure';
import { messages } from './messages';

export const bodyParts = [
  ['chest', 'chest'], ['back', 'back'], ['upper legs', 'thighs'], ['lower legs', 'calves'],
  ['shoulders', 'shoulders'], ['upper arms', 'upperArms'], ['lower arms', 'forearms'],
  ['waist', 'abs'], ['core', 'core'], ['glutes', 'glutes'], ['cardio', 'cardio'], ['neck', 'neck'],
] as const;
export const tools = [
  ['', 'noTool'], ['barbell', 'barbell'], ['dumbbell', 'dumbbell'], ['machine', 'machine'],
  ['cable', 'cable'], ['body weight', 'bodyweight'], ['kettlebell', 'kettlebell'], ['resistance band', 'band'],
  ['treadmill', 'treadmill'], ['stairmaster', 'stairmaster'],
] as const;
export const secondaryOptions = [
  ['quadriceps', 'quadriceps'], ['hamstrings', 'hamstrings'], ['glutes', 'glutes'],
  ['calves', 'calves'], ['abs', 'abs'], ['lower back', 'lowerBack'],
  ['chest', 'chest'], ['back', 'back'], ['shoulders', 'shoulders'], ['upper arms', 'upperArms'],
] as const;
export type ExerciseValues = {
  name: string; nameEn: string; bodyPart: string; target: string; equipment: string;
  secondaryMuscles: string[]; instructions: string[]; video: string;
};

export function ExercisePreview({ values }: { values: ExerciseValues }) {
  const t = useT(messages);
  const muscle = bodyParts.find(([value]) => value === values.bodyPart);
  const tool = tools.find(([value]) => value === values.equipment);
  return <section className="glass rounded-card border border-line-soft p-card" aria-label={t('preview')}>
    <h2 className="mb-stack font-bold">{t('preview')}</h2>
    <div className="glass-strong space-y-stack rounded-control p-card">
      <div className="flex aspect-video items-center justify-center rounded-control bg-surface-raised p-card text-sm text-muted">{t('noMedia')}</div>
      <h3 className="break-words text-base font-bold"><bdi>{values.name.trim() || t('new')}</bdi></h3>
      <p dir="ltr" className="break-words text-start text-xs text-muted">{values.nameEn.trim() || values.name.trim() || t('missing')}</p>
      <div className="flex flex-wrap gap-inline text-xs">
        <span className="rounded-full bg-surface-raised px-stack py-inline">{muscle ? t(muscle[1]) : t('missing')}</span>
        <span className="rounded-full bg-surface-raised px-stack py-inline">{tool ? t(tool[1]) : values.equipment || t('noTool')}</span>
        <span className="rounded-full bg-lime-soft px-stack py-inline text-lime">{t('own')}</span>
        {values.target.trim() && <span className="rounded-full bg-surface-raised px-stack py-inline"><bdi>{values.target}</bdi></span>}
      </div>
      <Disclosure label={t('instructions')}>
      {values.secondaryMuscles.length > 0 && <p className="text-sm text-muted">{values.secondaryMuscles.map(value => {
        const option = secondaryOptions.find(([key]) => key === value);
        return option ? t(option[1]) : value;
      }).join(' · ')}</p>}
      {values.instructions.length ? <ol className="list-decimal space-y-inline ps-card text-sm leading-relaxed">
        {values.instructions.map((step, index) => <li key={index} className="break-words">{step || t('step', { number: index + 1 })}</li>)}
      </ol> : <p className="text-sm text-muted">{t('noSteps')}</p>}
      </Disclosure>
    </div>
  </section>;
}
