'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { editableFieldClass } from '@/ui/edit-in-place';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { copyMealTemplate } from './copy-meal-template';
import { messages } from './messages';

export function MealCreationDialog({ plans, onClose }: { plans: { id: string; title: string }[]; onClose: () => void }) {
  const t = useT(messages), router = useRouter();
  const [template, setTemplate] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  async function create() {
    if (lock.current || !title.trim()) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      let id: string | null;
      if (template) id = await copyMealTemplate({ id: template, title });
      else {
        const { createTemplate } = await import('@/features/templates');
        const result = await createTemplate({ kind: 'nutrition', title });
        id = result.data ?? null;
      }
      if (!id) { setError(t('createError')); return; }
      onClose();
      router.push(`/captain/nutrition/${id}`);
    } catch { setError(t('createError')); }
    finally { lock.current = false; setBusy(false); }
  }

  const fieldClass = `${editableFieldClass} min-h-12 rounded-control bg-surface px-stack`;
  return <ResponsiveDialog modal fallbackId="meal-library-create" aria-label={t('newPlan')}
    onDismiss={() => { if (!lock.current) onClose(); }}
    className="sheet fixed inset-0 m-auto h-fit max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-card p-card text-ink">
    <h2 className="mb-card-gap text-title font-bold">{t('newPlan')}</h2>
    <form className="grid gap-card-gap" onSubmit={event => { event.preventDefault(); void create(); }}>
      {plans.length > 0 && <label className="grid gap-inline">
        {t('startWith')}
        <select className={fieldClass} value={template} disabled={busy} onChange={event => setTemplate(event.target.value)}>
          <option value="">{t('fromScratch')}</option>
          {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
        </select>
      </label>}
      <label className="grid gap-inline">
        {t('planName')}
        <input className={fieldClass} required maxLength={80} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} />
      </label>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <div className="flex flex-wrap gap-inline">
        <Button type="submit" disabled={busy || !title.trim()} block={false}>{t(busy ? 'creatingPlan' : 'createPlan')}</Button>
        <Button variant="secondary" disabled={busy} block={false} onClick={onClose}>{t('close')}</Button>
      </div>
    </form>
  </ResponsiveDialog>;
}
