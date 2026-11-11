'use client';
import type { Locale } from '@/core/i18n/locale';
import { messages } from '../messages';
import type { Question } from '../types';

export type QuestionValue = string | number | boolean | string[] | null;
export function QuestionField({ question: q, locale, value = null, readOnly = false, onChange, onPhotos }: {
  question: Question; locale: Locale; value?: QuestionValue; readOnly?: boolean;
  onChange?: (value: QuestionValue) => void; onPhotos?: (files: FileList | null) => void;
}) {
  const m = messages[locale], label = locale === 'ar' ? q.label_ar : q.label_en;
  const input = 'min-h-12 w-full rounded-control border border-line bg-surface px-3 text-ink';
  return <fieldset className="space-y-3 border-b border-line py-4" disabled={readOnly}>
    <legend className="pt-3 font-bold">{label}{q.required && <span className="ms-2 text-muted">{m.required}</span>}</legend>
    {q.type === 'text' && <textarea aria-label={label} className={input} value={typeof value === 'string' ? value : ''}
      required={q.required} onChange={e => onChange?.(e.target.value)} />}
    {(q.type === 'number' || q.type === 'scale') && <input type="number" aria-label={label} className={input}
      min={q.type === 'scale' ? 1 : undefined} max={q.type === 'scale' ? 10 : undefined}
      step={q.type === 'scale' ? 1 : 'any'} value={typeof value === 'number' ? value : ''} required={q.required}
      onChange={e => onChange?.(e.target.value === '' ? null : e.target.valueAsNumber)} />}
    {(q.type === 'choice' || q.type === 'multi') && <div className="flex flex-wrap gap-2">{q.options.map((option, index) =>
      <label key={option.value} className="glass flex min-h-12 items-center gap-3 rounded-control px-3">
        <input type={q.type === 'multi' ? 'checkbox' : 'radio'} name={q.id} value={option.value}
          required={q.required && (q.type === 'choice' || index === 0 && (!Array.isArray(value) || !value.length))}
          checked={q.type === 'multi' ? Array.isArray(value) && value.includes(option.value) : value === option.value}
          onChange={e => onChange?.(q.type === 'multi'
            ? e.target.checked ? [...(Array.isArray(value) ? value : []), option.value]
              : (Array.isArray(value) ? value : []).filter(v => v !== option.value) : option.value)} />
        {locale === 'ar' ? option.label_ar : option.label_en}
      </label>)}</div>}
    {q.type === 'yesno' && <div className="flex gap-3">{[true, false].map(answer =>
      <label key={String(answer)} className="glass flex min-h-12 items-center gap-3 rounded-control px-4">
        <input type="radio" name={q.id} required={q.required} checked={value === answer} onChange={() => onChange?.(answer)} />{answer ? m.yes : m.no}
      </label>)}</div>}
    {q.type === 'photos' && <input type="file" accept="image/*" multiple required={q.required} aria-label={label} className={input}
      onChange={e => onPhotos?.(e.target.files)} />}
  </fieldset>;
}
