import type { Locale } from '@/core/i18n/locale';
import { lazy, Suspense } from 'react';
import { messages } from '../messages';
import { newQuestion, reorderQuestions, validateForm } from '../model';
import type { FormDraft } from '../types';
import { QuestionEditor } from './question-editor';
import { ScheduleSection } from './schedule-section';

const FormPreview = lazy(() => import('./form-preview').then(module => ({ default: module.FormPreview })));

export function FormBuilder({ form, locale, status, preview, onChange, onPreview, onRetry, onDiscard }: {
  form: FormDraft; locale: Locale; status: 'saved' | 'pending' | 'saving' | 'saveError'; preview: boolean;
  onChange: (form: FormDraft) => void; onPreview: () => void; onRetry: () => void; onDiscard?: () => void;
}) {
  const m = messages[locale], invalid = validateForm(form).length > 0;
  return <section className="glass-strong min-w-0 rounded-card p-4 sm:p-6">
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="me-auto text-xl font-bold">{form.title}</h2>
      <span role="status" className="text-sm text-muted">{invalid ? m.invalid : m[status]}</span>
      {status === 'saveError' && <button type="button" className="min-h-12 px-3" onClick={onRetry}>{m.retry}</button>}
      {(invalid || status === 'saveError') && onDiscard && <button type="button" className="min-h-12 px-3" onClick={onDiscard}>{m.discard}</button>}
      <button type="button" className="glass min-h-12 rounded-control px-4" onClick={onPreview}>{preview ? m.back : m.preview}</button>
    </div>
    {preview ? <Suspense fallback={<p role="status">{m.loading}</p>}><FormPreview form={form} locale={locale} /></Suspense> : <>
      <label className="mt-4 block">{m.formTitle}<input className="mt-2 min-h-12 w-full rounded-control border border-line bg-surface px-3"
        value={form.title} onChange={e => onChange({ ...form, title: e.target.value })} /></label>
      {!form.questions.length && <p className="py-4 text-muted">{m.emptyQuestions}</p>}
      {form.questions.map((q, index) => <QuestionEditor key={q.id} question={q} locale={locale} index={index} count={form.questions.length}
        onChange={question => onChange({ ...form, questions: form.questions.map(q => q.id === question.id ? question : q) })}
        onDelete={() => onChange({ ...form, questions: form.questions.filter(item => item.id !== q.id).map((q, position) => ({ ...q, position })) })}
        onMove={direction => onChange({ ...form, questions: reorderQuestions(form.questions, index, index + direction) })} />)}
      <button type="button" className="mt-3 min-h-12 w-full rounded-control border border-dashed border-line px-4 text-lime"
        onClick={() => onChange({ ...form, questions: [...form.questions, newQuestion(form.id, form.questions.length)] })}>{m.add}</button>
      <ScheduleSection form={form} locale={locale} onChange={onChange} />
    </>}
  </section>;
}
