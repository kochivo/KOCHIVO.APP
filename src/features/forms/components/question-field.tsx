'use client';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { formCopy } from '../form-copy';
import type { Question } from '../types';

export type QuestionValue = string | number | boolean | string[] | null;
export function QuestionField({ question: q, locale, value = null, readOnly = false, onChange, onPhotos, preview = false, style }: {
  question: Question; locale: Locale; value?: QuestionValue; readOnly?: boolean;
  preview?: boolean;
  style?: ArabicStyle;
  onChange?: (value: QuestionValue) => void; onPhotos?: (files: FileList | null) => void;
}) {
  const m = formCopy(locale, style), label = locale === 'ar' ? q.label_ar : q.label_en.trim() || q.label_ar;
  const input = `min-h-12 w-full rounded-control border border-line bg-surface px-3 text-ink${preview ? ' min-w-0 font-display' : ''}`;
  const numberField = <input type="number" aria-label={label} className={input}
    min={q.type === 'scale' ? 1 : undefined} max={q.type === 'scale' ? 10 : undefined}
    step={q.type === 'scale' ? 1 : 'any'} value={typeof value === 'number' ? value : ''} required={q.required}
    onChange={e => onChange?.(e.target.value === '' ? null : e.target.valueAsNumber)} />;
  return <fieldset className={preview ? 'mb-[10px] min-w-0 space-y-2 rounded-[16px] border border-line-soft px-[14px] pb-3 text-[13px]' : 'space-y-3 border-b border-line py-4'} disabled={readOnly}>
    <legend className={preview ? 'float-start w-full pt-3 font-normal' : 'pt-3 font-bold'}>{label}{q.required && !preview && <span className="ms-2 text-muted">{m.required}</span>}</legend>
    {q.type === 'text' && <textarea aria-label={label} className={input} value={typeof value === 'string' ? value : ''}
      required={q.required} onChange={e => onChange?.(e.target.value)} />}
    {q.type === 'scale' && preview ? <div className="grid grid-cols-5 gap-1">{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <button key={n} type="button" aria-pressed={value === n}
      className="min-h-12 min-w-12 rounded-control bg-surface font-display text-xs text-faint aria-pressed:bg-lime aria-pressed:text-on-lime" onClick={() => onChange?.(n)}>{n}</button>)}</div>
      : (q.type === 'number' || q.type === 'scale') && (preview ? <div className="flex items-center gap-2">{numberField}
        {(q.maps_to === 'weight' || q.maps_to === 'targetWeight' || q.maps_to === 'waist' || q.maps_to === 'height')
          && <span className="shrink-0 text-faint">{m[q.maps_to === 'weight' || q.maps_to === 'targetWeight' ? 'kg' : 'cm']}</span>}</div> : numberField)}
    {(q.type === 'choice' || q.type === 'multi') && <div className="flex flex-wrap gap-2">{q.options.map((option, index) =>
      <label key={option.value} className="glass flex min-h-12 items-center gap-3 rounded-control px-3">
        <input type={q.type === 'multi' ? 'checkbox' : 'radio'} name={q.id} value={option.value}
          required={q.required && (q.type === 'choice' || index === 0 && (!Array.isArray(value) || !value.length))}
          checked={q.type === 'multi' ? Array.isArray(value) && value.includes(option.value) : value === option.value}
          onChange={e => onChange?.(q.type === 'multi'
            ? e.target.checked ? [...(Array.isArray(value) ? value : []), option.value]
              : (Array.isArray(value) ? value : []).filter(v => v !== option.value) : option.value)} />
        {locale === 'ar' ? option.label_ar : option.label_en.trim() || option.label_ar}
      </label>)}</div>}
    {q.type === 'yesno' && <div className="flex gap-3">{[true, false].map(answer =>
      <label key={String(answer)} className="glass flex min-h-12 items-center gap-3 rounded-control px-4">
        <input type="radio" name={q.id} required={q.required} checked={value === answer} onChange={() => onChange?.(answer)} />{answer ? m.yes : m.no}
      </label>)}</div>}
    {q.type === 'photos' && <input type="file" accept="image/*" multiple required={q.required} aria-label={label} className={input}
      onChange={e => onPhotos?.(e.target.files)} />}
  </fieldset>;
}
