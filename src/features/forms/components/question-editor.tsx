import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import { customFormQuestionTypes } from '@/types/enums';
import { messages } from '../messages';
import { mappingTypes } from '../model';
import type { Question } from '../types';
import { QuestionChips } from './question-chips';
import { QuestionRules } from './question-rules';

export function QuestionEditor({ question: q, locale, index, count, onChange, onDelete, onMove }: {
  question: Question; locale: Locale; index: number; count: number;
  onChange: (q: Question) => void; onDelete: () => void; onMove: (direction: number) => void;
}) {
  const m = messages[locale], input = 'min-h-12 w-full rounded-control border border-line bg-surface px-3';
  return <article className="space-y-3 border-b border-line py-4">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="me-auto font-bold">{index + 1}. {locale === 'ar' ? q.label_ar : q.label_en}</h3>
      <button type="button" className="min-h-12 min-w-12" aria-label={m.up} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp className="mx-auto size-5" /></button>
      <button type="button" className="min-h-12 min-w-12" aria-label={m.down} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown className="mx-auto size-5" /></button>
      <button type="button" className="min-h-12 min-w-12 text-danger" aria-label={m.remove} onClick={onDelete}><Trash2 className="mx-auto size-5" /></button>
    </div>
    <QuestionChips question={q} locale={locale} />
    <div className="grid gap-3 sm:grid-cols-2">
      <label>{m.labelAr}<input className={input} dir="rtl" value={q.label_ar} onChange={e => onChange({ ...q, label_ar: e.target.value })} /></label>
      <label>{m.labelEn}<input className={input} dir="ltr" value={q.label_en} onChange={e => onChange({ ...q, label_en: e.target.value })} /></label>
      <label>{m.type}<select className={input} value={q.type} onChange={e => {
        const type = customFormQuestionTypes.find(type => type === e.target.value);
        if (type) onChange({ ...q, type, maps_to: q.maps_to && mappingTypes[q.maps_to].includes(type) ? q.maps_to : null, alert_on: null });
      }}>{customFormQuestionTypes.map(type => <option key={type} value={type}>{m.types[type]}</option>)}</select></label>
      <label className="flex min-h-12 items-center gap-3"><input type="checkbox" checked={q.required} onChange={e => onChange({ ...q, required: e.target.checked })} />{m.required}</label>
    </div>
    <QuestionRules question={q} locale={locale} onChange={onChange} />
  </article>;
}
