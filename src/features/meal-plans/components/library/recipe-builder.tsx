'use client';
import { NumberInput } from '@/ui/number-input';
import { useId, useRef, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { useToast } from '@/ui/toast';
import type { Food } from '../../types';
import { saveLibraryRecipe } from '../../data/library-recipe';
import { invalidateFoodResources } from '../../data/food-resource-version';
import { matchesFood, recipeNutrition } from './library-model';
import type { Ingredient } from './library-model';
import { messages } from './v2/messages';
import { messages as baseMessages } from './messages';

export function RecipeBuilder({ foods, onClose, onSaved }: { foods: Food[]; onClose: () => void; onSaved: () => void }) {
  const t = useT(messages), bt = useT(baseMessages), locale = useLocale(), toast = useToast(), title = useId();
  const [name, setName] = useState(''), [query, setQuery] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]), [weight, setWeight] = useState(1000);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const result = weight > 0 ? recipeNutrition(ingredients, weight) : null;
  const plateLabels = ['small', 'medium', 'large'] as const;
  const input = 'min-h-12 w-full rounded-control border border-line bg-surface px-stack';
  async function save() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const saved = await saveLibraryRecipe({ name, cookedWeight: weight, ingredients: ingredients.map(item => ({ id: item.food.id, grams: item.grams })) });
      if (!saved.ok) { setError(saved.error); return; }
      invalidateFoodResources(); toast.success({ title: t('saved'), detail: t('savedDetail') }); onSaved();
    } catch { setError(bt('error')); }
    finally { lock.current = false; setBusy(false); }
  }
  return <ResponsiveDialog modal fallbackId="new-library-food" onDismiss={() => { if (!busy) onClose(); }} aria-labelledby={title} className="sheet fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] max-w-3xl overflow-y-auto rounded-t-card p-card text-ink">
    <header className="flex items-center justify-between gap-stack"><h2 id={title} className="text-title font-bold">{t('recipeNew')}</h2><IconButton disabled={busy} aria-label={bt('close')} onClick={onClose}><X aria-hidden /></IconButton></header>
    <fieldset disabled={busy} className="grid gap-card-gap py-page-y">
      <label className="grid gap-inline">{t('recipeName')}<input required maxLength={60} className={input} value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="grid gap-inline">{bt('search')}<input className={input} value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label className="grid gap-inline">{t('ingredient')}<select className={input} value="" onChange={event => {
        const food = foods.find(food => food.id === event.target.value);
        if (food) setIngredients(value => value.some(item => item.food.id === food.id) ? value : [...value, { food, grams: 100 }]);
      }}><option value="">{t('choose')}</option>{foods.filter(food => matchesFood(food, query)).map(food => <option key={food.id} value={food.id}>{locale === 'en' ? food.nameEn || food.name : food.name}</option>)}</select></label>
      {!ingredients.length && <p className="text-muted">{t('ingredient')}</p>}
      {ingredients.map((item, index) => <div key={item.food.id} className="flex items-center gap-stack"><span className="me-auto">{item.food.name}</span><label><span className="sr-only">{t('grams')}</span><NumberInput className={`${input} max-w-28`} min={1} max={10000} value={item.grams} onCommit={grams => setIngredients(value => value.map((entry, position) => position === index ? { ...entry, grams } : entry))} /></label><IconButton aria-label={t('remove')} onClick={() => setIngredients(value => value.filter((_, position) => position !== index))}><Trash2 aria-hidden /></IconButton></div>)}
      <label className="grid gap-inline">{t('cookedWeight')}<NumberInput className={input} min={1} max={100000} value={weight} onCommit={value => setWeight(Math.max(0, Math.min(100000, value || 0)))} /></label>
      {result && <div className="grid gap-stack">{[{ label: t('total'), values: result.total }, { label: t('per100'), values: result.per100 }, ...result.plates.map((values, index) => ({ label: t(plateLabels[index] ?? 'small', { grams: values.grams }), values }))].map(row => <section key={row.label} className="glass-strong rounded-control p-card"><h3>{row.label}</h3><dl className="grid grid-cols-4 gap-inline">{(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <div key={key}><dt className="text-xs text-muted">{bt(key)}</dt><dd className="font-display text-title">{Math.round(row.values[key] * 10) / 10}</dd></div>)}</dl></section>)}</div>}
    </fieldset>
    {error && <p role="alert" className="text-danger">{error}</p>}
    <footer className="sheet sticky bottom-0 py-stack"><Button disabled={busy || !name.trim() || !ingredients.length || weight <= 0} onClick={() => void save()}>{busy ? bt('saving') : t('saveRecipe')}</Button></footer>
  </ResponsiveDialog>;
}
