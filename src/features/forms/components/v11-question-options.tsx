import { X } from 'lucide-react';
import { EditInPlace } from '@/ui/edit-in-place';
import { Disclosure } from '@/ui/disclosure';
import { uuidv7 } from '@/core/offline/ids';
import { createT } from '@/core/i18n/messages';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { workspaceMessages } from '../messages';
import { formCopy } from '../form-copy';
import type { Question } from '../types';
import { editorButton } from './v11-question-controls';

export function V11QuestionOptions({ question: q, locale, style, onChange }: { question: Question; locale: Locale; style?: ArabicStyle; onChange: (q: Question) => void }) {
  const t = createT(workspaceMessages, locale, style), m = formCopy(locale, style);
  return <div className="flex flex-wrap gap-inline">
    {q.options.map((option, index) => <div key={option.value} className="glass flex max-w-full items-center rounded-control border border-line">
      <EditInPlace label={`${m.optionsAr} ${index + 1}`} value={option.label_ar} dir="rtl"
        className="w-40 border-0 text-xs" onChange={e => onChange({ ...q, options: q.options.map(o => o.value === option.value ? { ...o, label_ar: e.target.value } : o) })} />
      <button type="button" aria-label={`${m.removeOption} ${index + 1}`} className={editorButton} onClick={() => onChange({ ...q, options: q.options.filter(o => o.value !== option.value) })}><X aria-hidden className="size-4" /></button>
    </div>)}
    {!q.options.length && <p className="w-full text-xs text-muted">{t('emptyOptions')}</p>}
    <button type="button" className={`${editorButton} border-dashed text-lime`} onClick={() => onChange({ ...q, options: [...q.options, { value: uuidv7(), label_ar: '', label_en: '' }] })}>{t('addOption')}</button>
    {q.options.length > 0 && <Disclosure label={m.optionsEn} className="w-full">
      <div className="space-y-inline">{q.options.map((option, index) => <EditInPlace key={option.value} label={`${m.optionsEn} ${index + 1}`} value={option.label_en} dir="ltr"
        onChange={e => onChange({ ...q, options: q.options.map(o => o.value === option.value ? { ...o, label_en: e.target.value } : o) })} />)}</div>
    </Disclosure>}
  </div>;
}
