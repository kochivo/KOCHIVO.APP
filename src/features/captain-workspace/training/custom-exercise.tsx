'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { LibraryExercise } from '@/features/programs';
import { programMessages } from '@/features/programs';
import { saveCustom } from './data/editor-actions';
import { messages } from './editor/messages';
import { messages as trainingMessages } from './messages';

export function CustomExercise({ onAdd, exercise }: { onAdd: (row: LibraryExercise) => void; exercise?: LibraryExercise }) {
  const t = useT(messages), tt = useT(trainingMessages), pt = useT(programMessages);
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [values, setValues] = useState({ name: exercise?.name_ar || exercise?.name_en || '', bodyPart: exercise?.body_part || 'chest', equipment: exercise?.equipment || '', target: exercise?.target || '', video: exercise?.video_url || '' });
  const opener = `custom-exercise-${exercise?.id ?? 'new'}`;
  return <div className="px-[18px] pb-3">
    <button id={opener} className="min-h-12 rounded-full border border-line-soft px-3 text-xs text-muted" onClick={() => setOpen(true)}>{exercise ? pt('editCustomExercise') : t('custom')}</button>
    {open && <ResponsiveDialog modal openerId={opener} fallbackId={opener} aria-label={t('custom')} onDismiss={() => { if (!busy) setOpen(false); }} className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-card p-5 text-ink backdrop:bg-bg-deep/80">
      <form className="space-y-3" onSubmit={async event => {
        event.preventDefault(); if (busy) return; setBusy(true); setError('');
        try { const result = await saveCustom(values, exercise?.id); if (result.error !== undefined) setError(result.error);
          else { onAdd(result.data); setOpen(false); if (!exercise) setValues({ name: '', bodyPart: 'chest', equipment: '', target: '', video: '' }); }
        } catch { setError(tt('error')); } finally { setBusy(false); }
      }}><h2 className="font-display text-[19px]">{t('custom')}</h2>
        <fieldset disabled={busy} className="space-y-3">
          {(['name', 'target', 'video'] as const).map(key => <label key={key} className="block text-xs text-faint">{t(key === 'name' ? 'customName' : key)}
            <input required={key === 'name'} type={key === 'video' ? 'url' : 'text'} maxLength={key === 'name' ? 60 : key === 'target' ? 40 : 500} value={values[key]} onChange={event => setValues({ ...values, [key]: event.target.value })} className="block min-h-12 w-full rounded-control border border-line bg-transparent px-3 text-sm text-ink" /></label>)}
          <label className="block text-xs text-faint">{t('bodyPart')}<select value={values.bodyPart} onChange={event => setValues({ ...values, bodyPart: event.target.value })} className="block min-h-12 w-full bg-surface text-ink">
            {(['chest', 'back', 'upper legs', 'lower legs', 'shoulders', 'upper arms', 'lower arms', 'waist', 'core', 'glutes', 'cardio', 'neck'] as const).map((part, index) => <option key={part} value={part}>{pt((['chest', 'back', 'thighs', 'calves', 'shoulders', 'upperArms', 'forearms', 'abs', 'core', 'glutes', 'cardio', 'neck'] as const)[index] ?? 'chest')}</option>)}
          </select></label>
          {values.bodyPart === 'cardio' && <label className="block text-xs text-faint">{t('equipment')}<select value={values.equipment} onChange={event => setValues({ ...values, equipment: event.target.value })} className="block min-h-12 w-full bg-surface text-ink"><option value="">{pt('noMachine')}</option><option value="treadmill">{pt('treadmill')}</option><option value="stairmaster">{pt('stairmaster')}</option></select></label>}
          <button type="submit" className="min-h-12 rounded-full border border-line px-4">{t('create')}</button>
        </fieldset>
        {busy && <p role="status">{tt('loading')}</p>}{error && <p role="alert" className="text-danger">{error}</p>}
      <button type="button" disabled={busy} className="min-h-12 rounded-full border border-line px-4" onClick={() => setOpen(false)}>{t('close')}</button>
      </form>
    </ResponsiveDialog>}
  </div>;
}
