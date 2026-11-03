import { ageLabel } from '../merge';
import type { InboxItem } from '../types';

export function InboxRow({ item, now, selected, onSelect }: { item: InboxItem; now: Date; selected: boolean; onSelect: () => void }) {
  return <button onClick={onSelect} aria-pressed={selected} className={`glass flex min-h-12 w-full gap-3 rounded-card p-4 text-start ${selected ? 'border-lime' : ''}`}>
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xl font-bold">{item.player_name.charAt(0)}</span>
    <span className="min-w-0 flex-1 space-y-2">
      <span className="flex flex-wrap justify-between gap-2"><strong>{item.player_name}</strong><span className="text-xs text-muted">{ageLabel(item.created_at, now)}</span></span>
      <span className="block text-sm text-muted"><span className="text-lime">{item.kind === 'form' ? 'فيديو أداء' : 'تحديث أسبوعي'}</span> · {item.kind === 'form' ? item.exercise_name : `أسبوع ${item.week_start}`}</span>
    </span>
  </button>;
}
