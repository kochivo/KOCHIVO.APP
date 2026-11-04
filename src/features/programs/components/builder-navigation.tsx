'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { Button, Chip, EmptyState } from '@/ui';
import { Dumbbell } from 'lucide-react';
import { addDay } from '../draft';
import { messages } from '../messages';
import { weekdayStatus } from '../summary';
import { isWeekly, weekdayKeys } from '../weekly-draft';
import type { ProgramDraft } from '../types';

export function BuilderNavigation({ draft, selectedId, onSelect, update }: {
  draft: ProgramDraft; selectedId?: string; onSelect: (id: string) => void;
  update: (operation: (draft: ProgramDraft) => ProgramDraft) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const add = () => {
    const id = uuidv7(); update(current => addDay(current, id, t('newDay'))); onSelect(id);
  };
  return <aside aria-label={t('programDays')} className="glass min-w-0 space-y-3 rounded-card p-4">
    <h2 id="program-days-heading" tabIndex={-1} className="font-bold">{t('programDays')}</h2>
    {draft.days.length === 0 && <EmptyState icon={Dumbbell} title={t('addTheFirstDay')} body={t('emptyBody')}
      action={{ label: t('addDay'), onClick: add }} />}
    <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
      {draft.days.map(item => <li key={item.id} className="shrink-0 lg:shrink">
        <Chip pressed={item.id === selectedId} onClick={() => onSelect(item.id)}
          className="flex min-h-16 w-full flex-col items-start justify-center gap-1 py-3 text-start">
          <span className="min-w-0 max-w-64 break-words font-bold lg:max-w-full">{item.weekday != null ? t(weekdayKeys[item.weekday] ?? 'sat')
            : `${formatNumber(item.position, locale)} · ${item.title ? starterText(item.title, locale) : t('newDay')}`}</span>
          <span className="text-xs tabular-nums">{weekdayStatus(item, locale)}</span>
        </Chip>
      </li>)}
    </ul>
    {!isWeekly(draft) && draft.days.length > 0 && <Button variant="secondary" block onClick={add}>{t('addDay')}</Button>}
  </aside>;
}
