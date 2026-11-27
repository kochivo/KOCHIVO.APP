'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { localeDir } from '@/core/i18n/locale';
import { Button, buttonClass } from '@/ui/button';
import { uuidv7 } from '@/core/offline/ids';
import { findImportCaptain, savePlanImport } from './actions';
import { messages } from './messages';
import { NutritionPreview } from './nutrition-preview';
import { TrainingPreview } from './training-preview';
import { portionKey, portionName, reviewNumber } from './import-review-model';
import type { Review } from './import-review-model';

const field = 'min-h-12 w-full rounded-control border border-line bg-surface px-stack text-ink';

export function PlanImportScreen() {
  const locale = useLocale(), t = useT(messages);
  const [captain, setCaptain] = useState<{ id: string; full_name: string; email: string } | null>(null);
  const [kind, setKind] = useState<Review['kind']>('nutrition');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [review, setReview] = useState<Review | null>(null);
  const [pending, setPending] = useState<'finding' | 'reading' | 'saving' | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const importId = useRef('');

  async function run(action: NonNullable<typeof pending>, work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setPending(action);
    setError('');
    try { await work(); }
    catch { setError(t('generic')); }
    finally { lock.current = false; setPending(null); }
  }

  function resetReview() {
    setReview(null);
    setSaved(false);
    setError('');
    importId.current = '';
  }

  function find(form: FormData) {
    return run('finding', async () => {
      const email = form.get('email');
      if (typeof email !== 'string') return;
      setCaptain(null);
      resetReview();
      const result = await findImportCaptain(email);
      setCaptain(result.data ?? null);
      if (!result.data) setError(result.error ?? t('generic'));
    });
  }

  function preview() {
    if (!file) return;
    return run('reading', async () => {
      try {
        const { prepareWorkbook } = await import('./prepare-workbook');
        setReview(await prepareWorkbook(file, kind));
        importId.current = uuidv7();
      } catch (cause) {
        const code = cause instanceof Error ? cause.message : '';
        setError(t(code === 'differentWeeks' || code === 'fileSize' ? code : 'format'));
      }
    });
  }

  function save(form: FormData) {
    if (!captain || !review || saved) return;
    return run('saving', async () => {
      if (review.kind === 'nutrition') {
        const invalid = review.plan.meals.flatMap(meal => meal.items).find(row => {
          const grams = row.amount * (row.unit === 'g' ? 1 : reviewNumber(form, portionKey(row)));
          return !Number.isFinite(grams) || grams < 5 || grams > 2000;
        });
        if (invalid) {
          setError(t('portionRange', { name: portionName(invalid) }));
          return;
        }
      }
      const base = { id: importId.current, captainId: captain.id, title, kind: review.kind, source: review.source };
      const plan = review.kind === 'nutrition' ? {
        targets: review.plan.targets, water: review.plan.water, meals: review.plan.meals.map(meal => ({
          name: meal.name, items: meal.items.map(row => ({ ...row, name: portionName(row),
            gramsPerUnit: row.unit === 'g' ? 1 : reviewNumber(form, portionKey(row)) })),
        })),
      } : {
        weeks: review.plan.weeks, days: review.plan.days.map((day, dayIndex) => ({
          name: day.name, warmup: day.warmup, exercises: day.exercises.map((row, rowIndex) => ({
            ...row, rest: row.rest ?? reviewNumber(form, 'defaultRest'),
            rirs: row.rirText ? row.rirs.map((_, set) => reviewNumber(form, `rir:${dayIndex}:${rowIndex}:${set}`)) : row.rirs,
            note: [row.note, row.warmup ? t('warmup', { value: row.warmup }) : ''].filter(Boolean).join('\n'),
          })),
        })),
      };
      const result = await savePlanImport({ ...base, ...plan });
      if (result.data) setSaved(true);
      else setError(result.error ?? t('generic'));
    });
  }

  return <main dir={localeDir(locale)} className="mx-auto w-full max-w-3xl space-y-section px-page-x py-page-y">
    <Link href={`/${locale}/admin`} className={buttonClass({ variant: 'secondary', block: false })}>{t('back')}</Link>
    <h1 className="text-h font-bold">{t('title')}</h1>
    <form onSubmit={event => { event.preventDefault(); void find(new FormData(event.currentTarget)); }}
      className="glass grid gap-card-gap rounded-card p-card">
      <fieldset disabled={pending !== null} className="grid gap-stack">
        <label className="grid gap-inline">{t('email')}
          <input type="email" dir="ltr" name="email" className={field} maxLength={254} required
            onChange={() => { setCaptain(null); resetReview(); }} />
        </label>
        <Button variant={captain ? 'secondary' : 'primary'} type="submit" block={false}>{t('find')}</Button>
      </fieldset>
      {captain && <p className="text-sm">{t('found')} <strong>{captain.full_name}</strong> <bdi>{captain.email}</bdi></p>}
    </form>
    <section className="glass space-y-card-gap rounded-card p-card">
      <fieldset disabled={pending !== null || !captain} className="grid gap-card-gap">
        <label className="grid gap-inline">{t('kind')}
          <select className={field} value={kind} onChange={event => {
            setKind(event.target.value === 'training' ? 'training' : 'nutrition');
            resetReview();
          }}>
            <option value="nutrition">{t('nutrition')}</option><option value="training">{t('training')}</option>
          </select>
        </label>
        <label className="grid gap-inline">{t('file')}
          <input className={`${field} py-stack`} aria-describedby="workbook-hint" type="file" accept=".xlsx" onChange={event => {
            const selected = event.target.files?.[0] ?? null;
            resetReview();
            setFile(selected);
            setTitle((selected?.name ?? '').replace(/\.xlsx$/i, '').trim().slice(0, 80));
          }} />
        </label>
        <p id="workbook-hint" className="text-sm text-muted">{t('hint')}</p>
        <Button variant={review ? 'secondary' : 'primary'} disabled={!file} onClick={preview} block={false}>{t('review')}</Button>
      </fieldset>
      {!review && !pending && <p className="text-sm text-muted">{t('empty')}</p>}
    </section>
    {review && <form onSubmit={event => { event.preventDefault(); void save(new FormData(event.currentTarget)); }}
      className="glass space-y-card-gap rounded-card p-card">
      <p className="text-sm text-muted">{t('reviewHint')}</p>
      <p className="text-sm text-muted">{t('sourceHint', { n: review.source.sheets.length })}</p>
      <fieldset disabled={pending !== null || saved} className="grid gap-card-gap">
        <label className="grid gap-inline">{t('name')}
          <input className={field} required maxLength={80} value={title} onChange={event => setTitle(event.target.value)} />
        </label>
        {review.kind === 'nutrition' ? <NutritionPreview plan={review.plan} /> : <TrainingPreview plan={review.plan} />}
        <Button type="submit" block={false}>{t('save')}</Button>
      </fieldset>
    </form>}
    {pending && <p role="status" className="text-muted">{t(pending)}</p>}
    {error && <p role="alert" className="break-words text-danger">{error}</p>}
    {saved && <p role="status" className="glass-strong rounded-card p-card font-semibold">{t('saved')}</p>}
  </main>;
}
