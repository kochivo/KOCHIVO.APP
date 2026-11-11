import type { Locale } from '@/core/i18n/locale';
import type { CustomFormFactKey } from '@/types/enums';
import { uuidv7 } from '@/core/offline/ids';
import { messages } from '../messages';
import { mappingTypes } from '../model';
import type { Question } from '../types';

export function QuestionRules({ question: q, locale, onChange }: {
  question: Question; locale: Locale; onChange: (question: Question) => void;
}) {
  const m = messages[locale], input = 'min-h-12 w-full rounded-control border border-line bg-surface px-3';
  const facts = Object.keys(mappingTypes) as CustomFormFactKey[];
  function options(text: string, language: 'ar' | 'en') {
    const lines = text.split('\n');
    const length = Math.max(lines.length, q.options.length);
    onChange({ ...q, options: Array.from({ length }, (_, i) => ({
      value: q.options[i]?.value ?? uuidv7(),
      label_ar: language === 'ar' ? lines[i] ?? '' : q.options[i]?.label_ar ?? '',
      label_en: language === 'en' ? lines[i] ?? '' : q.options[i]?.label_en ?? '',
    })) });
  }
  return <div className="grid gap-3 sm:grid-cols-2">
    {['choice','multi'].includes(q.type) && <>
      <label>{m.optionsAr}<textarea className={input} value={q.options.map(o => o.label_ar).join('\n')} onChange={e => options(e.target.value, 'ar')} /></label>
      <label>{m.optionsEn}<textarea className={input} value={q.options.map(o => o.label_en).join('\n')} onChange={e => options(e.target.value, 'en')} /></label>
      {q.options.map((option, i) => <button key={option.value} type="button" className="min-h-12 text-danger"
        onClick={() => onChange({ ...q, options: q.options.filter((_, index) => index !== i) })}>{m.removeOption} {i + 1}</button>)}
    </>}
    <label>{m.mapping}<select className={input} value={q.maps_to ?? ''} onChange={e => onChange({ ...q, maps_to: facts.find(f => f === e.target.value) ?? null })}>
      <option value="">{m.none}</option>{facts.filter(f => mappingTypes[f].includes(q.type)).map(f => <option key={f} value={f}>{m.facts[f]}</option>)}
    </select></label>
    <label>{m.alertRule}<select className={input} value={q.alert_on?.operator ?? ''} onChange={e => {
      const op = e.target.value;
      onChange({ ...q, alert_on: op === 'eq' || op === 'gt' || op === 'lt' ? { operator: op, value: ['number','scale'].includes(q.type) ? 0 : q.type === 'yesno' ? true : '' } : null });
    }}><option value="">{m.none}</option><option value="eq">{m.alertEqual}</option>
      {['number','scale'].includes(q.type) && <><option value="gt">{m.alertAbove}</option><option value="lt">{m.alertBelow}</option></>}
    </select></label>
    {q.alert_on && <label>{m.alertValue}{q.type === 'yesno' ? <select className={input} value={String(q.alert_on.value)}
      onChange={e => q.alert_on && onChange({ ...q, alert_on: { ...q.alert_on, value: e.target.value === 'true' } })}>
      <option value="true">{m.yes}</option><option value="false">{m.no}</option></select>
      : <input className={input} type={['number','scale'].includes(q.type) ? 'number' : 'text'} value={String(q.alert_on.value)}
        onChange={e => q.alert_on && onChange({ ...q, alert_on: { ...q.alert_on, value: ['number','scale'].includes(q.type) ? e.target.valueAsNumber : e.target.value } })} />}</label>}
  </div>;
}
