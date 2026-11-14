import { useState } from 'react';
import type { ComponentProps } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, GripVertical, Hash, Image, List, Star, Type, X } from 'lucide-react';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from '../messages';
import { formCopy } from '../form-copy';
import { newQuestion, reorderQuestions, validateForm } from '../model';
import type { Question } from '../types';
import { assessmentWeekday, recurrenceLabel } from '../assessment-summary';
import type { FormBuilder } from './form-builder';
import { QuestionEditor } from './question-editor';
import { V11FormSettings } from './v11-form-settings';
import { V11QuestionPreview } from './v11-question-preview';
import { questionTypeLabel } from './v11-question-type';
import { questionCount } from '../question-count';

const icons = { number: Hash, text: Type, choice: List, multi: List, yesno: List, scale: Star, photos: Image };

export function V11FormBuilder({ form, locale, style, status, onChange, onRetry, onDiscard, players, scheduleContext }: ComponentProps<typeof FormBuilder>) {
  const t = createT(workspaceMessages, locale, style), m = formCopy(locale, style);
  const [selected, setSelected] = useState(form.questions[0]?.id), [dragged, setDragged] = useState<number | null>(null);
  const q = form.questions.find(q => q.id === selected) ?? form.questions[0], index = form.questions.findIndex(item => item.id === q?.id);
  const schedule = form.schedule ? `${form.schedule.every === 'week' ? `${m.week} ${assessmentWeekday(form.schedule.weekday, locale)}` : `${m.month} ${form.schedule.day}`} · ${form.schedule.hour}:00`
    : scheduleContext?.schedules[0] ? recurrenceLabel(scheduleContext.schedules[0], locale) : t('manual');
  function move(from: number, to: number) { onChange({ ...form, questions: reorderQuestions(form.questions, from, to) }); }
  function remove(id: string) { onChange({ ...form, questions: form.questions.filter(q => q.id !== id).map((q, position) => ({ ...q, position })) }); }
  function update(question: Question) { onChange({ ...form, questions: form.questions.map(q => q.id === question.id ? question : q) }); }
  function add(type: Question['type']) {
    const question = { ...newQuestion(form.id, form.questions.length), type };
    onChange({ ...form, questions: [...form.questions, question] }); setSelected(question.id);
  }
  return <section className="min-w-0">
    <PageBarTitle title={form.title} subtitle={`${questionCount(form.questions.length, locale, style)} · ${t('sends')} ${schedule}`} />
    <PageBarActions><Link href={`/${locale}/captain/library/forms`} prefetch={false} className="flex min-h-12 items-center px-3 text-sm">{t('back')}</Link>
      <button type="button" disabled={status === 'saving' || validateForm(form).length > 0} onClick={onRetry} className="min-h-12 rounded-full bg-lime px-5 text-sm font-semibold text-on-lime disabled:opacity-50">{status === 'saving' ? m.saving : t('save')}</button></PageBarActions>
    {status === 'saveError' && <p role="alert" className="mb-3 text-danger">{m.saveError}<button type="button" className="min-h-12 px-3" onClick={onRetry}>{m.retry}</button>
      <button type="button" className="min-h-12 px-3" onClick={onDiscard}>{m.discard}</button></p>}
    {validateForm(form).length > 0 && <p role="status" className="mb-3 text-sm text-muted">{m.invalid}</p>}
    <div className="grid items-start gap-3 min-[761px]:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-3">
        <section className="glass overflow-hidden rounded-card border border-line-soft p-4">
          {!form.questions.length && <p className="p-4 text-muted">{m.emptyQuestions}</p>}
          {form.questions.map((question, n) => {
            const Icon = icons[question.type];
            return <div key={question.id} draggable onDragStart={() => setDragged(n)} onDragEnd={() => setDragged(null)} onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (dragged !== null) move(dragged, n); setDragged(null); }}
              className={`flex items-center gap-2 rounded-control border-b border-line-soft ${q?.id === question.id ? 'bg-lime-soft' : ''}`}>
              <button type="button" onClick={() => setSelected(question.id)} aria-pressed={q?.id === question.id} className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-2 py-3 text-start">
                <GripVertical aria-hidden className="size-4 shrink-0 text-faint" /><span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface"><Icon aria-hidden className="size-4" /></span>
                <span className="min-w-0"><b className="block break-words text-sm">{n + 1}. {locale === 'ar' ? question.label_ar : question.label_en || question.label_ar}</b>
                  <small className="text-muted">{questionTypeLabel(question.type, locale, style)}{question.required && ` · ${m.required}`}</small></span>
              </button><button type="button" onClick={() => remove(question.id)} aria-label={m.remove} className="grid min-h-12 min-w-12 place-items-center text-faint"><X aria-hidden className="size-4" /></button>
            </div>;
          })}
          {q && <div className="mt-2 flex gap-2 min-[761px]:hidden">{([-1, 1] as const).map(direction => <button key={direction} type="button" aria-label={direction === -1 ? m.up : m.down}
            disabled={index + direction < 0 || index + direction >= form.questions.length} onClick={() => move(index, index + direction)} className="grid min-h-12 min-w-12 place-items-center rounded-control border border-line disabled:opacity-40">
            {direction === -1 ? <ArrowUp aria-hidden className="size-4" /> : <ArrowDown aria-hidden className="size-4" />}</button>)}</div>}
        </section>
        <section className="glass rounded-card border border-line-soft p-4"><h2 className="mb-3 text-sm font-semibold">{t('add')}</h2>
          <div className="grid grid-cols-3 gap-1.5 min-[761px]:grid-cols-5">{(['number', 'text', 'choice', 'scale', 'photos'] as const).map(type => {
            const Icon = icons[type];
            return <button key={type} type="button" onClick={() => add(type)} className="glass flex min-h-12 flex-col items-center justify-center gap-1 rounded-control border border-line px-1 py-2 text-[11px]"><Icon aria-hidden className="size-4 text-lime" />{questionTypeLabel(type, locale, style)}</button>;
          })}</div></section>
        <V11FormSettings schedule={schedule} form={form} locale={locale} style={style} onChange={onChange} players={players} scheduleContext={scheduleContext} canManage={status === 'saved' && scheduleContext?.ready !== false} />
        {q && <QuestionEditor key={q.id} question={q} locale={locale} style={style} index={index} count={form.questions.length} onChange={update} onDelete={() => remove(q.id)} onMove={direction => move(index, index + direction)}
          onDuplicate={() => {
            const copy = { ...structuredClone(q), id: newQuestion(form.id, form.questions.length).id, position: form.questions.length };
            onChange({ ...form, questions: [...form.questions, copy] }); setSelected(copy.id);
          }} />}
      </div>
      <aside className="sticky top-20 hidden justify-center min-[761px]:flex">
        <div className="glass-strong flex min-h-[500px] w-[280px] min-w-0 flex-col gap-3.5 rounded-[32px] border border-line px-4 py-5">
          <p className="text-xs text-muted">{t('preview')}</p><div className="flex gap-1" aria-hidden>{form.questions.map((question, n) => <span key={question.id} className={`h-1 flex-1 rounded-full ${n <= index ? 'bg-lime' : 'bg-surface'}`} />)}</div>
          {q ? <V11QuestionPreview key={q.id} question={q} locale={locale} style={style} /> : <p className="text-muted">{m.emptyQuestions}</p>}
          <button type="button" disabled={!q} onClick={() => setSelected(form.questions[(index + 1) % form.questions.length]?.id)} className="mt-auto min-h-12 rounded-full bg-lime px-5 text-sm font-semibold text-on-lime">{t('next')}</button>
        </div>
      </aside>
    </div>
  </section>;
}
