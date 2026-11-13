'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { addWarmupItem, removeWarmupItem, moveWarmupItem, setRamp, warmupMinutes, rampSets, useDragReorder } from '@/features/programs';
import type { DraftDay, DayWarmup, WarmupItem } from '@/features/programs';
import { messages } from './editor/messages';
import { editWarmup } from './editor-draft';
import type { Update } from './editor-draft';
import { WarmupRow } from './warmup-row';
import { WarmupLibraryPicker } from './warmup-library-picker';

export function WarmupBlock({ day, update }: { day: DraftDay; update: Update }) {
  const t = useT(messages), [open, setOpen] = useState(true), [name, setName] = useState('');
  const warmup = day.warmup;
  const [libraryOpen, setLibraryOpen] = useState(false);
  const change = (operation: (current: DayWarmup) => DayWarmup) => update(draft => {
    const current = draft.days.find(row => row.id === day.id);
    return current ? editWarmup(draft, day.id, operation(current.warmup)) : draft;
  });
  const presets = [
    { key: 'bike', chip: 'bikeChip', amount: 5, unit: 'min', note: t('bikeNote') },
    { key: 'joints', chip: 'jointsChip', amount: 10, unit: 'times', note: t('jointsNote') },
    { key: 'band', chip: 'bandChip', amount: 15, unit: 'reps' },
    { key: 'rope', chip: 'ropeChip', amount: 2, unit: 'min' },
    { key: 'squat', chip: 'squatChip', amount: 15, unit: 'reps' },
  ] as const;
  const add = (item: Omit<WarmupItem, 'id'>) => change(current => current.items.length < 12 ? addWarmupItem(current, { ...item, id: uuidv7() }) : current);
  const { listRef, handleProps, rowStyle } = useDragReorder(warmup.items.map(item => item.id), (id, to) => change(current => {
    const items = [...current.items], from = items.findIndex(item => item.id === id);
    if (from < 0) return current;
    const item = items.splice(from, 1)[0];
    if (item) items.splice(to, 0, item);
    return { ...current, items };
  }));
  return <section className="glass rounded-card border border-line-soft">
    <button aria-expanded={open} aria-controls={`warmup-${day.id}`} className="flex min-h-16 w-full items-center gap-2.5 px-[18px] py-3.5 text-start" onClick={() => setOpen(value => !value)}>
      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-warn-soft font-display text-xs font-extrabold text-warn">{1}</span>
      <h2 className="font-display text-[19px] font-semibold">{t('warmTitle')}</h2><span className="text-xs text-faint">{t('warmCount', { n: warmup.items.length, m: warmupMinutes(warmup) })}</span>
      {open ? <ChevronUp aria-hidden className="ms-auto size-4" /> : <ChevronDown aria-hidden className="ms-auto size-4" />}
    </button>
    {open && <div id={`warmup-${day.id}`}>
      <p className="px-[18px] pb-3 text-xs text-faint">{t('warmHint')}</p>
      <div className="flex flex-wrap gap-2 px-[18px] pb-3">{presets.filter(preset => !warmup.items.some(item => item.name === t(preset.key))).map(preset =>
        <button key={preset.key} disabled={warmup.items.length >= 12} className="min-h-12 rounded-full border border-line-soft px-3 text-xs text-muted disabled:opacity-40" onClick={() => add({ name: t(preset.key), amount: preset.amount, unit: preset.unit, note: 'note' in preset ? preset.note : undefined })}>{t(preset.chip)}</button>)}</div>
      {!warmup.items.length && <p className="px-[18px] pb-3 text-xs text-faint">{t('emptyWarm')}</p>}
      <ol ref={listRef}>{warmup.items.map((item, index) => <WarmupRow key={item.id} item={item} dragProps={handleProps(item.id)} style={rowStyle(index)}
        onChange={next => change(current => ({ ...current, items: current.items.map(row => row.id === item.id ? next : row) }))}
        onRemove={() => change(current => removeWarmupItem(current, item.id))} onMove={delta => change(current => moveWarmupItem(current, item.id, delta))} />)}</ol>
      <form className="flex flex-wrap gap-2 px-[18px] py-3" onSubmit={event => { event.preventDefault(); if (name.trim() && warmup.items.length < 12) { add({ name: name.trim(), amount: 1, unit: 'min' }); setName(''); } }}>
        <input aria-label={t('warmName')} placeholder={t('warmName')} maxLength={60} value={name} onChange={event => setName(event.target.value)} className="min-h-12 min-w-0 flex-1 rounded-control border border-line-soft bg-transparent px-3 text-sm" />
        <button disabled={!name.trim() || warmup.items.length >= 12} className="min-h-12 rounded-full border border-line-soft px-3 text-xs disabled:opacity-40">{t('addWarm')}</button>
        <button type="button" aria-expanded={libraryOpen} aria-controls={`warmup-library-${day.id}`} className="min-h-12 rounded-full border border-line-soft px-3 text-xs" onClick={() => setLibraryOpen(value => !value)}>{t('warmFromMine')}</button>
      </form>
      {libraryOpen && <div id={`warmup-library-${day.id}`}><WarmupLibraryPicker items={warmup.items} onAdd={item => change(current =>
        current.items.length >= 12 || current.items.some(row => row.exerciseId === item.exerciseId) ? current : addWarmupItem(current, item))} /></div>}
      <div className="mx-[18px] mb-3.5 flex flex-wrap items-center gap-2.5 rounded-control bg-surface/50 px-3.5 py-3 text-xs">
        <label className="flex min-h-12 items-center gap-2.5"><input type="checkbox" role="switch" className="size-6 accent-lime" checked={warmup.ramp} onChange={event => change(current => setRamp(current, event.target.checked))} />{t('ramp')}</label>
        {warmup.ramp && <>{rampSets(null).map(row => <span key={row.percent} dir="ltr" className="rounded-full border border-line px-2.5 py-1 font-display font-extrabold">{t('rampPill', { percent: row.percent, reps: row.reps })}</span>)}<span className="text-faint">{t('rampHint')}</span></>}
      </div>
    </div>}
  </section>;
}
