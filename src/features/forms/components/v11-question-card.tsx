import { editableFieldClass } from '@/ui/edit-in-place';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import { DisclosureChevron } from '@/ui/disclosure-chevron';
import type { ComponentProps } from 'react';
import { Disclosure } from '@/ui/disclosure';
import { createT } from '@/core/i18n/messages';
import { formCopy } from '../form-copy';
import { workspaceMessages } from '../messages';
import { messages as redesign } from '../redesign/messages';
import { mappingTypes } from '../model';
import type { QuestionEditor } from './question-editor';
import { QuestionRules } from './question-rules';
import { QuestionToggle } from './question-toggle';
import { V11QuestionOptions } from './v11-question-options';
import { questionTypeLabel } from './v11-question-type';
import { questionIcons, questionTypes, editorButton } from './v11-question-controls';

export function V11QuestionCard({ question: q, locale, style, index, count, open, onToggle, onChange, onDelete, onMove, onDuplicate }: ComponentProps<typeof QuestionEditor> & { open: boolean; onToggle: () => void }) {
  const m = formCopy(locale, style), t = createT(workspaceMessages, locale, style), r = createT(redesign, locale, style);
  const Icon = questionIcons[q.type];
  const input = 'min-h-12 w-full rounded-control border border-line bg-surface px-3 text-sm focus-visible:ring-2 focus-visible:ring-lime';
  return <section className={`glass overflow-hidden rounded-[18px] border ${open ? 'border-lime/40' : 'border-line-soft'}`}>
    <button type="button" aria-expanded={open} aria-controls={`question-${q.id}`} onClick={onToggle}
      className="press flex min-h-20 w-full cursor-pointer items-center gap-3 p-4 text-start hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lime">
      <GripVertical aria-hidden className="size-4 shrink-0 text-faint" />
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface"><Icon aria-hidden className="size-4" /></span>
      <span className="min-w-0 flex-1"><b className="block break-words text-sm">{index + 1}. {locale === 'ar' ? q.label_ar : q.label_en || q.label_ar}</b>
        <small className="text-muted">{questionTypeLabel(q.type, locale, style)}{q.required && ` · ${m.required}`}</small></span>
      <DisclosureChevron expanded={open} className="size-4" />
    </button>
    {open && <div id={`question-${q.id}`} className="space-y-3 border-t border-line-soft p-4">
      <label className="block space-y-2 text-xs text-muted"><span>{m.labelAr}</span><input aria-label={m.labelAr} dir="rtl" className={`${editableFieldClass} ${input}`} value={q.label_ar} onChange={e => onChange({ ...q, label_ar: e.target.value })} /></label>
      <div><p className="mb-2 text-xs text-muted">{r('answerWith')}</p>
        <div className="flex flex-wrap gap-2">{questionTypes.map(type => <button key={type} type="button" aria-pressed={q.type === type}
          className={`${editorButton} aria-pressed:border-lime/40 aria-pressed:bg-lime-soft aria-pressed:text-lime`}
          onClick={() => { if (q.type !== type) onChange({ ...q, type, maps_to: q.maps_to && mappingTypes[q.maps_to].includes(type) ? q.maps_to : null, alert_on: null }); }}>{questionTypeLabel(type, locale, style)}</button>)}</div>
      </div>
      {(q.type === 'choice' || q.type === 'multi') && <V11QuestionOptions question={q} locale={locale} style={style} onChange={onChange} />}
      <div className="[&_button]:cursor-pointer [&_button]:rounded-control [&_button]:border [&_button]:border-line [&_button]:bg-surface [&_button]:px-3 [&_button]:active:scale-[.98] [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-lime">
        <QuestionToggle label={m.required} checked={q.required} onChange={required => onChange({ ...q, required })} />
      </div>
      <Disclosure label={t('questionSettings')}>
        <label className="mb-3 block space-y-2 text-xs text-muted"><span>{r('optionalEnglish')}</span><input aria-label={m.labelEn} dir="ltr" className={`${editableFieldClass} ${input}`} value={q.label_en} onChange={e => onChange({ ...q, label_en: e.target.value })} /></label>
        <div className="[&_button]:cursor-pointer [&_button]:rounded-control [&_button]:border [&_button]:border-line [&_button]:bg-surface [&_button]:px-3 [&_button]:active:scale-[.98] [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-lime [&_summary]:cursor-pointer [&_summary]:active:scale-[.98] [&_summary:focus-visible]:ring-2 [&_summary:focus-visible]:ring-lime">
          {(q.type === 'number' || q.type === 'scale') && <QuestionToggle label={r('chart')} checked={q.show_chart !== false} onChange={show_chart => onChange({ ...q, show_chart })} />}
          <QuestionRules question={q} locale={locale} style={style} onChange={onChange} />
        </div>
      </Disclosure>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={editorButton} aria-label={m.up} disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden className="size-4" /></button>
        <button type="button" className={editorButton} aria-label={m.down} disabled={index === count - 1} onClick={() => onMove(1)}><ArrowDown aria-hidden className="size-4" /></button>
        <button type="button" className={editorButton} onClick={onDuplicate}>{r('duplicate')}</button>
        <button type="button" className={`${editorButton} ms-auto text-danger`} aria-label={m.remove} onClick={onDelete}><Trash2 aria-hidden className="size-4" /></button>
      </div>
    </div>}
  </section>;
}
