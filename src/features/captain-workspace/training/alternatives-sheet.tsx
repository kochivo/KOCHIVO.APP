'use client';
import type { DraftExercise } from '@/features/programs';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { X } from 'lucide-react';
import { InlineSearch } from './inline-search';
import { messages } from './editor/messages';
import type { Patch } from './exercise-row';

export function AlternativesSheet({ row, onPatch, onClose }: {
  row: DraftExercise; onPatch: (patch: Patch) => void; onClose: () => void;
}) {
  const t = useT(messages);
  const selected = row.alternatives ?? [];
  const opener = `alternatives-${row.id}`;
  return <ResponsiveDialog modal openerId={opener} fallbackId={opener} onDismiss={onClose} aria-label={t('alternatives')}
    className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg space-y-3 overflow-y-auto rounded-card p-5 text-ink backdrop:bg-bg-deep/80">
    <div className="flex items-center justify-between gap-3"><h2 className="font-display text-[19px]">{t('alternatives')}</h2>
      <button className="min-h-12 px-3" onClick={onClose}>{t('close')}</button></div>
    <p className="text-xs text-faint">{t('alternativesHint')}</p>
    <div className="flex flex-wrap gap-2">{selected.length ? selected.map(id => {
      const library = row.alternative_library?.find(item => item.id === id);
      const name = library?.name_en || library?.name_ar || t('alternativeUnavailable');
      return <button key={id} aria-label={t('removeAlternative', { name })} className="flex min-h-12 max-w-full items-center gap-2 rounded-full border border-line px-3 text-xs"
        onClick={() => onPatch({ alternatives: selected.filter(value => value !== id),
          alternative_library: row.alternative_library?.filter(value => value.id !== id) })}><bdi className="min-w-0 break-words">{name}</bdi><X aria-hidden className="size-3 shrink-0" /></button>;
    }) : <p className="text-xs text-faint">{t('alternativesEmpty')}</p>}</div>
    <InlineSearch day={{ id: row.day_id, program_id: '', position: 1, title: row.library?.body_part ?? '',
      warmup: { items: [], ramp: false }, exercises: [row] }} excluded={[row.exercise_id, ...selected]} disabled={selected.length >= 3}
      onAdd={library => { if (selected.length < 3 && library.id !== row.exercise_id && !selected.includes(library.id)) {
        onPatch({ alternatives: [...selected, library.id], alternative_library: [...(row.alternative_library ?? []), library] });
      } }} onLibraryChange={library => onPatch({ alternative_library: row.alternative_library?.map(item => item.id === library.id ? library : item) })} />
  </ResponsiveDialog>;
}
