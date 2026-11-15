'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { Chip } from '@/ui';
import { goals, levels, equipmentTiers, injuries, generatorBriefSchema } from '../brief';
import type { GeneratorBrief } from '../brief';
import { messages, weekdays } from '../messages';

export function BriefSheet({ brief, playerName, profileWarning = false, inDialog = false, onChange, onGenerate, onClose }: {
  brief: GeneratorBrief; playerName?: string; profileWarning?: boolean; inDialog?: boolean;
  onChange: (brief: GeneratorBrief) => void; onGenerate: () => void; onClose: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const panel = captainWorkspaceEnabled() ? 'glass min-w-0 space-y-inline rounded-card border border-line-soft p-card' : 'space-y-inline';
  const toggleDay = (day: number) => onChange({ ...brief, weekdays: brief.weekdays.includes(day)
    ? brief.weekdays.filter(value => value !== day) : [...brief.weekdays, day].sort((a, b) => a - b) });
  return <form id="generator-brief" dir={locale === 'en' ? 'ltr' : 'rtl'} className="space-y-card-gap"
    onSubmit={event => { event.preventDefault(); if (generatorBriefSchema.safeParse(brief).success) onGenerate(); }}>
    {!inDialog && <header className={captainWorkspaceEnabled() ? 'captain-dialog-header flex items-center justify-between gap-card-gap' : undefined}>
      <h2 id="generator-heading" className="text-2xl font-bold">{t('brief')}</h2>
      {captainWorkspaceEnabled() && <Button type="button" onClick={onClose} aria-label={t('close')}
        variant={'secondary'} block={false} className={"press flex min-h-12 min-w-12 cursor-pointer items-center justify-center bg-surface-raised focus-visible:ring-2 focus-visible:ring-lime"}>
        <X aria-hidden className="size-5" />
      </Button>}
    </header>}
    <div className={captainWorkspaceEnabled() ? 'captain-dialog-body grid gap-stack min-[761px]:grid-cols-2' : 'space-y-card-gap'}>
    {playerName && <p className="font-bold"><bdi>{playerName}</bdi></p>}
    {profileWarning && <p role="note" className="text-sm text-muted">{t('profileWarning')}</p>}
    <fieldset className={panel}><legend className="mb-inline font-bold">{t('goal')}</legend>
      <div className="flex flex-wrap gap-inline">{goals.map(goal => <Chip key={goal} pressed={brief.goal === goal}
        onClick={() => onChange({ ...brief, goal })}>{t(goal)}</Chip>)}</div>
    </fieldset>
    <fieldset className={panel}><legend className="mb-inline font-bold">{t('level')}</legend>
      <div className="flex flex-wrap gap-inline">{levels.map(level => <Chip key={level} pressed={brief.level === level}
        onClick={() => onChange({ ...brief, level })}>{t(level)}</Chip>)}</div>
    </fieldset>
    <fieldset className={panel}><legend className="mb-inline font-bold">{t('weekdays')}</legend>
      <div className="flex flex-wrap gap-inline">{weekdays.map((key, day) => <Chip key={key} pressed={brief.weekdays.includes(day)}
        disabled={!brief.weekdays.includes(day) && brief.weekdays.length >= 6} onClick={() => toggleDay(day)}>{t(key)}</Chip>)}</div>
    </fieldset>
    <fieldset className={panel}><legend className="mb-inline font-bold">{t('minutes')}</legend>
      <div className="flex flex-wrap gap-inline">{([45, 60, 90] as const).map(minutes => <Chip key={minutes} pressed={brief.minutes === minutes}
        onClick={() => onChange({ ...brief, minutes })}>{t('duration', { count: formatNumber(minutes, locale) })}</Chip>)}</div>
    </fieldset>
    <fieldset className={panel}><legend className="mb-inline font-bold">{t('equipment')}</legend>
      <div className="flex flex-wrap gap-inline">{equipmentTiers.map(equipment => <Chip key={equipment} pressed={brief.equipment === equipment}
        onClick={() => onChange({ ...brief, equipment })}>{t(equipment)}</Chip>)}</div>
    </fieldset>
    <fieldset className={panel}><legend className="mb-inline font-bold">{t('injuries')}</legend>
      <div className="flex flex-wrap gap-inline"><Chip pressed={!brief.injuries.length}
        onClick={() => onChange({ ...brief, injuries: [] })}>{t('none')}</Chip>
        {injuries.map(injury => <Chip key={injury} pressed={brief.injuries.includes(injury)} onClick={() => onChange({ ...brief,
          injuries: brief.injuries.includes(injury) ? brief.injuries.filter(value => value !== injury) : [...brief.injuries, injury] })}>{t(injury)}</Chip>)}
      </div>
    </fieldset>
    </div>
    {!inDialog && <footer className={captainWorkspaceEnabled() ? 'captain-dialog-footer flex flex-wrap gap-inline' : 'flex flex-wrap gap-inline'}>
      <Button className="min-h-12" type="submit" disabled={!generatorBriefSchema.safeParse(brief).success}>{t('generate')}</Button>
      {!captainWorkspaceEnabled() && <Button className="min-h-12" variant="ghost" onClick={onClose}>{t('close')}</Button>}
    </footer>}
  </form>;
}
