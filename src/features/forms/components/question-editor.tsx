import { ArrowDown, ArrowUp, ChevronDown, CircleDot, Image as ImageIcon } from 'lucide-react';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { formCopy } from '../form-copy';
import { messages as redesign } from '../redesign/messages';
import { mappingTypes } from '../model';
import { questionSummary } from '../question-summary';
import type { Question } from '../types';
import { QuestionRules } from './question-rules';
import { QuestionToggle } from './question-toggle';
import { ThemedSelect } from './themed-select';

export function QuestionEditor({ question: q, locale, index, count, onChange, onDelete, onMove, onDuplicate, style }: {
  question: Question; locale: Locale; index: number; count: number; style?: ArabicStyle;
  onChange: (q: Question) => void; onDelete: () => void; onMove: (direction: number) => void; onDuplicate?: () => void;
}) {
  const m = formCopy(locale, style), t = createT(redesign, locale, style);
  const input = 'min-h-12 w-full rounded-control border border-line bg-transparent px-[14px] text-[15px]';
  const choice = q.type === 'choice' || q.type === 'multi' || q.type === 'yesno';
  function changeType(type: Question['type']) {
    if (type === q.type) return;
    onChange({ ...q, type, maps_to: q.maps_to && mappingTypes[q.maps_to].includes(type) ? q.maps_to : null, alert_on: null });
  }
  return <details className="group glass mb-3 min-w-0 rounded-card border border-line-soft open:border-line">
    <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-[18px] py-[14px]">
      <span className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-surface font-display text-xs font-extrabold">{index + 1}</span>
      <span className="min-w-0 flex-1"><b className="block break-words font-medium">{locale === 'ar' ? q.label_ar : q.label_en || q.label_ar}</b>
        <small className="block text-[11.5px] text-faint">{questionSummary(q, locale, style)}</small></span>
      {q.required && <span className="rounded-full bg-surface px-[10px] py-[3px] text-[11.5px] text-muted">{m.required}</span>}
      <ChevronDown aria-hidden className="size-4 shrink-0 text-faint group-open:rotate-180" />
    </summary>
    <div className="px-[18px] pb-[18px]">
      <input aria-label={m.labelAr} dir="rtl" className={input} value={q.label_ar} onChange={e => onChange({ ...q, label_ar: e.target.value })} />
      <details className="mb-[14px] text-xs text-faint">
        <summary className="min-h-12 cursor-pointer list-none py-3">{t('optionalEnglish')}</summary>
        <input aria-label={m.labelEn} dir="ltr" className={input} value={q.label_en} onChange={e => onChange({ ...q, label_en: e.target.value })} />
      </details>
      <p className="mb-2 text-xs text-faint">{t('answerWith')}</p>
      <div className="mb-4 grid grid-cols-3 gap-2 min-[761px]:grid-cols-5">
        {(['number', 'scale', 'choice', 'text', 'photos'] as const).map(type => <button type="button" key={type}
          aria-pressed={q.type === type || type === 'choice' && choice} onClick={() => { if (type !== 'choice' || !choice) changeType(type); }}
          className="min-h-16 rounded-[14px] border border-line-soft px-[6px] py-[10px] text-xs text-muted aria-pressed:border-lime aria-pressed:bg-lime-soft aria-pressed:text-lime">
          <span className="mb-[2px] block font-display text-[15px] font-extrabold text-ink">
            {type === 'choice' ? <CircleDot aria-hidden className="mx-auto size-5" /> : type === 'photos' ? <ImageIcon aria-hidden className="mx-auto size-5" />
              : t(type === 'number' ? 'numberSymbol' : type === 'scale' ? 'scaleSymbol' : 'textSymbol')}
          </span>{t(type === 'photos' ? 'photo' : type)}
        </button>)}
      </div>
      {choice && <ThemedSelect label={m.type} value={q.type} onChange={value => {
        if (value === 'choice' || value === 'multi' || value === 'yesno') changeType(value);
      }} options={(['choice', 'multi', 'yesno'] as const).map(value => ({ value, label: m.types[value] }))} />}
      <QuestionToggle label={t('required')} checked={q.required} onChange={required => onChange({ ...q, required })} />
      {(q.type === 'number' || q.type === 'scale') && <QuestionToggle label={t('chart')} checked={q.show_chart !== false}
        onChange={show_chart => onChange({ ...q, show_chart })} />}
      <QuestionRules question={q} locale={locale} style={style} onChange={onChange} />
      <div className="mt-[10px] flex flex-wrap justify-end gap-2">
        <button type="button" className="min-h-12 min-w-12 rounded-full border border-line" aria-label={m.up} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden className="mx-auto size-4" /></button>
        <button type="button" className="min-h-12 min-w-12 rounded-full border border-line" aria-label={m.down} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown aria-hidden className="mx-auto size-4" /></button>
        <button type="button" className="min-h-12 rounded-full border border-line px-[14px] text-[12.5px]" onClick={onDuplicate}>{t('duplicate')}</button>
        <button type="button" className="min-h-12 rounded-full border border-line px-[14px] text-[12.5px] text-danger" onClick={onDelete}>{t('remove')}</button>
      </div>
    </div>
  </details>;
}
