'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button, Chip } from '@/ui';
import { goals, levels, equipmentTiers, injuries, generatorBriefSchema } from '../brief';
import type { GeneratorBrief } from '../brief';
import { messages, weekdays } from '../messages';

export function BriefSheet({ brief, playerName, profileWarning = false, onChange, onGenerate, onClose }: {
  brief: GeneratorBrief; playerName?: string; profileWarning?: boolean;
  onChange: (brief: GeneratorBrief) => void; onGenerate: () => void; onClose: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const toggleDay = (day: number) => onChange({ ...brief, weekdays: brief.weekdays.includes(day)
    ? brief.weekdays.filter(value => value !== day) : [...brief.weekdays, day].sort((a, b) => a - b) });
  return <form dir={locale === 'ar' ? 'rtl' : 'ltr'} className="space-y-5"
    onSubmit={event => { event.preventDefault(); if (generatorBriefSchema.safeParse(brief).success) onGenerate(); }}>
    <h2 id="generator-heading" className="text-2xl font-bold">{t('brief')}</h2>
    {playerName && <p className="font-bold"><bdi>{playerName}</bdi></p>}
    {profileWarning && <p role="note" className="text-sm text-muted">{t('profileWarning')}</p>}
    <fieldset className="space-y-2"><legend className="mb-2 font-bold">{t('goal')}</legend>
      <div className="flex flex-wrap gap-2">{goals.map(goal => <Chip key={goal} pressed={brief.goal === goal}
        onClick={() => onChange({ ...brief, goal })}>{t(goal)}</Chip>)}</div>
    </fieldset>
    <fieldset className="space-y-2"><legend className="mb-2 font-bold">{t('level')}</legend>
      <div className="flex flex-wrap gap-2">{levels.map(level => <Chip key={level} pressed={brief.level === level}
        onClick={() => onChange({ ...brief, level })}>{t(level)}</Chip>)}</div>
    </fieldset>
    <fieldset className="space-y-2"><legend className="mb-2 font-bold">{t('weekdays')}</legend>
      <div className="flex flex-wrap gap-2">{weekdays.map((key, day) => <Chip key={key} pressed={brief.weekdays.includes(day)}
        disabled={!brief.weekdays.includes(day) && brief.weekdays.length >= 6} onClick={() => toggleDay(day)}>{t(key)}</Chip>)}</div>
    </fieldset>
    <fieldset className="space-y-2"><legend className="mb-2 font-bold">{t('minutes')}</legend>
      <div className="flex flex-wrap gap-2">{([45, 60, 90] as const).map(minutes => <Chip key={minutes} pressed={brief.minutes === minutes}
        onClick={() => onChange({ ...brief, minutes })}>{t('duration', { count: formatNumber(minutes, locale) })}</Chip>)}</div>
    </fieldset>
    <fieldset className="space-y-2"><legend className="mb-2 font-bold">{t('equipment')}</legend>
      <div className="flex flex-wrap gap-2">{equipmentTiers.map(equipment => <Chip key={equipment} pressed={brief.equipment === equipment}
        onClick={() => onChange({ ...brief, equipment })}>{t(equipment)}</Chip>)}</div>
    </fieldset>
    <fieldset className="space-y-2"><legend className="mb-2 font-bold">{t('injuries')}</legend>
      <div className="flex flex-wrap gap-2"><Chip pressed={!brief.injuries.length}
        onClick={() => onChange({ ...brief, injuries: [] })}>{t('none')}</Chip>
        {injuries.map(injury => <Chip key={injury} pressed={brief.injuries.includes(injury)} onClick={() => onChange({ ...brief,
          injuries: brief.injuries.includes(injury) ? brief.injuries.filter(value => value !== injury) : [...brief.injuries, injury] })}>{t(injury)}</Chip>)}
      </div>
    </fieldset>
    <div className="flex flex-wrap gap-2">
      <Button className="min-h-12" type="submit" disabled={!generatorBriefSchema.safeParse(brief).success}>{t('generate')}</Button>
      <Button className="min-h-12" variant="ghost" onClick={onClose}>{t('close')}</Button>
    </div>
  </form>;
}
