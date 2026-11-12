import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { CustomFormFactKey } from '@/types/enums';
import { uuidv7 } from '@/core/offline/ids';
import { formCopy } from '../form-copy';
import { messages as redesign } from '../redesign/messages';
import { mappingTypes } from '../model';
import type { Question } from '../types';
import { ThemedSelect } from './themed-select';
import { QuestionToggle } from './question-toggle';

export function QuestionRules({ question: q, locale, onChange, style }: {
  question: Question; locale: Locale; style?: ArabicStyle; onChange: (question: Question) => void;
}) {
  const m = formCopy(locale, style), t = createT(redesign, locale, style);
  const input = 'min-h-12 min-w-0 rounded-control border border-line bg-transparent px-3';
  const facts = Object.keys(mappingTypes) as CustomFormFactKey[], numeric = q.type === 'number' || q.type === 'scale';
  function options(text: string, language: 'ar' | 'en') {
    const lines = text.split('\n'), length = Math.max(lines.length, q.options.length);
    onChange({ ...q, options: Array.from({ length }, (_, i) => ({ value: q.options[i]?.value ?? uuidv7(),
      label_ar: language === 'ar' ? lines[i] ?? '' : q.options[i]?.label_ar ?? '',
      label_en: language === 'en' ? lines[i] ?? '' : q.options[i]?.label_en ?? '',
    })) });
  }
  return <div>
    {['choice','multi'].includes(q.type) && <div className="my-3 grid gap-3 sm:grid-cols-2">
      <label className="text-xs text-muted">{m.optionsAr}<textarea className={`${input} mt-2 w-full`} value={q.options.map(o => o.label_ar).join('\n')} onChange={e => options(e.target.value, 'ar')} /></label>
      <label className="text-xs text-muted">{m.optionsEn}<textarea className={`${input} mt-2 w-full`} value={q.options.map(o => o.label_en).join('\n')} onChange={e => options(e.target.value, 'en')} /></label>
      {q.options.map((option, i) => <button key={option.value} type="button" className="min-h-12 text-danger"
        onClick={() => onChange({ ...q, options: q.options.filter((_, index) => index !== i) })}>{m.removeOption} {i + 1}</button>)}
    </div>}
    <div className="flex flex-wrap items-center gap-2 border-t border-line-soft py-3 text-[13px]">
      <span>{t('profile')}</span><ThemedSelect label={t('profile')} value={q.maps_to ?? ''}
        options={[{ value: '', label: m.none }, ...facts.filter(f => mappingTypes[f].includes(q.type)).map(value => ({ value, label: m.facts[value] }))]}
        onChange={value => onChange({ ...q, maps_to: facts.find(f => f === value) ?? null })} />
    </div>
    <QuestionToggle label={t('alert')} checked={q.alert_on !== null} disabled={q.type === 'photos'}
      onChange={enabled => onChange({ ...q, alert_on: enabled ? { operator: numeric ? 'lt' : 'eq',
        value: numeric ? 6 : q.type === 'yesno' ? true : q.options[0]?.value ?? '' } : null })} />
    {q.alert_on && <div className="flex flex-wrap items-center gap-2 rounded-[14px] bg-warn-soft px-3 py-[10px] text-[13px] text-warn">
      <span>{t('alertSentence')}</span><ThemedSelect label={m.alertRule} value={q.alert_on.operator}
        options={[{ value: 'eq', label: m.alertEqual }, ...(numeric ? [{ value: 'lt', label: m.alertBelow }, { value: 'gt', label: m.alertAbove }] : [])]}
        onChange={value => { if (q.alert_on && (value === 'eq' || value === 'lt' || value === 'gt')) onChange({ ...q, alert_on: { ...q.alert_on, operator: value } }); }} />
      {q.type === 'yesno' || q.type === 'choice' || q.type === 'multi' ? <ThemedSelect label={m.alertValue} value={String(q.alert_on.value)}
        options={q.type === 'yesno' ? [{ value: 'true', label: m.yes }, { value: 'false', label: m.no }]
          : q.options.map(o => ({ value: o.value, label: locale === 'ar' ? o.label_ar : o.label_en || o.label_ar }))}
        onChange={value => q.alert_on && onChange({ ...q, alert_on: { ...q.alert_on, value: q.type === 'yesno' ? value === 'true' : value } })} />
        : <input aria-label={m.alertValue} className={`${input} w-24 text-ink`} type={numeric ? 'number' : 'text'} value={String(q.alert_on.value)}
          onChange={e => q.alert_on && onChange({ ...q, alert_on: { ...q.alert_on, value: numeric ? e.target.valueAsNumber : e.target.value } })} />}
      <span>{t('alertHint')}</span>
    </div>}
  </div>;
}
