'use client';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { formCopy } from '../form-copy';
import type { Question } from '../types';
import { Camera } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import { messages as v6Messages } from '../v6-messages';

export type QuestionValue = string | number | boolean | string[] | null;
export function QuestionField({ question: q, locale, value = null, readOnly = false, onChange, onPhotos, preview = false, style, playerCard = false }: {
  question: Question; locale: Locale; value?: QuestionValue; readOnly?: boolean;
  preview?: boolean;
  playerCard?: boolean;
  style?: ArabicStyle;
  onChange?: (value: QuestionValue) => void; onPhotos?: (files: FileList | null) => void;
}) {
  const m = formCopy(locale, style), label = locale === 'ar' ? q.label_ar : q.label_en.trim() || q.label_ar;
  const v6t = createT(v6Messages, locale, style);
  const input = `min-h-12 w-full rounded-control border border-line bg-surface px-stack text-ink${preview ? ' min-w-0 font-display' : ''}`;
  const numberField = <input type="number" aria-label={label} className={input}
    min={q.type === 'scale' ? 1 : undefined} max={q.type === 'scale' ? 10 : undefined}
    step={q.type === 'scale' ? 1 : 'any'} value={typeof value === 'number' ? value : ''} required={q.required}
    onChange={e => onChange?.(e.target.value === '' ? null : e.target.valueAsNumber)} />;
  return <fieldset className={preview ? 'mb-stack min-w-0 space-y-inline rounded-[16px] border border-line-soft px-card pb-stack text-row' :
    playerCard ? 'min-w-0 space-y-stack' : 'space-y-stack border-b border-line py-page-y'} disabled={readOnly}>
    <legend className={preview ? 'float-start w-full pt-stack font-normal' : playerCard ? 'mb-stack text-h font-bold' : 'pt-stack font-bold'}>{label}{q.required && !preview && <span className={playerCard ? 'sr-only' : 'ms-inline text-muted'}>{m.required}</span>}</legend>
    {q.type === 'text' && <textarea aria-label={label} className={`${input}${preview ? ' resize-none' : ''}`} value={typeof value === 'string' ? value : ''}
      required={q.required} onChange={e => onChange?.(e.target.value)} />}
    {q.type === 'scale' && preview ? <div className="grid grid-cols-5 gap-inline">{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <button key={n} type="button" aria-pressed={value === n}
      className="min-h-12 min-w-12 rounded-control bg-surface font-display text-xs text-faint aria-pressed:bg-lime aria-pressed:text-on-lime" onClick={() => onChange?.(n)}>{n}</button>)}</div>
      : (q.type === 'number' || q.type === 'scale') && (preview ? <div className="clear-both flex min-w-0 items-center gap-inline">{numberField}
        {(q.maps_to === 'weight' || q.maps_to === 'targetWeight' || q.maps_to === 'waist' || q.maps_to === 'height')
          && <span className="shrink-0 text-faint">{m[q.maps_to === 'weight' || q.maps_to === 'targetWeight' ? 'kg' : 'cm']}</span>}</div> : numberField)}
    {(q.type === 'choice' || q.type === 'multi') && <div className={playerCard ? 'grid gap-stack' : 'flex flex-wrap gap-inline'}>{q.options.map((option, index) =>
      <label key={option.value} className={playerCard ? 'glass flex min-h-16 cursor-pointer items-center gap-stack rounded-control border border-line-soft px-card has-checked:border-lime has-checked:bg-lime-soft has-checked:font-bold' : 'glass flex min-h-12 items-center gap-stack rounded-control px-stack'}>
        <input type={q.type === 'multi' ? 'checkbox' : 'radio'} name={q.id} value={option.value}
          className={playerCard ? 'size-5 shrink-0 accent-lime' : undefined}
          required={q.required && (q.type === 'choice' || index === 0 && (!Array.isArray(value) || !value.length))}
          checked={q.type === 'multi' ? Array.isArray(value) && value.includes(option.value) : value === option.value}
          onChange={e => onChange?.(q.type === 'multi'
            ? e.target.checked ? [...(Array.isArray(value) ? value : []), option.value]
              : (Array.isArray(value) ? value : []).filter(v => v !== option.value) : option.value)} />
        {locale === 'ar' ? option.label_ar : option.label_en.trim() || option.label_ar}
      </label>)}</div>}
    {q.type === 'yesno' && <div className={playerCard ? 'grid gap-stack' : 'flex gap-stack'}>{[true, false].map(answer =>
      <label key={String(answer)} className={playerCard ? 'glass flex min-h-16 cursor-pointer items-center gap-stack rounded-control border border-line-soft px-card has-checked:border-lime has-checked:bg-lime-soft has-checked:font-bold' : 'glass flex min-h-12 items-center gap-stack rounded-control px-page-x'}>
        <input type="radio" name={q.id} required={q.required} checked={value === answer} className={playerCard ? 'size-5 shrink-0 accent-lime' : undefined} onChange={() => onChange?.(answer)} />{answer ? m.yes : m.no}
      </label>)}</div>}
    {q.type === 'photos' && (preview ? <div className="glass flex aspect-[3/4] flex-col items-center justify-center gap-card-gap rounded-card border border-line-soft p-card text-muted">
      <Camera aria-hidden className="size-8" /><p className="text-sm">{v6t('photo')}</p>
      <label className="glass flex min-h-12 cursor-pointer items-center rounded-full border border-line-soft px-page-x">{v6t('camera')}
        <input type="file" accept="image/*" capture="user" className="sr-only" aria-label={v6t('camera')} onChange={event => onPhotos?.(event.target.files)} /></label>
      <label className="glass flex min-h-12 cursor-pointer items-center rounded-full border border-line-soft px-page-x">{v6t('gallery')}
        <input type="file" accept="image/*" multiple className="sr-only" aria-label={v6t('gallery')} onChange={event => onPhotos?.(event.target.files)} /></label>
    </div> : <input type="file" accept="image/*" multiple required={q.required} aria-label={label} className={input}
      onChange={e => onPhotos?.(e.target.files)} />)}
  </fieldset>;
}
