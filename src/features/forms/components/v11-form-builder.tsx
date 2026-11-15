import { useState } from 'react';
import type { ComponentProps } from 'react';
import Link from 'next/link';
import { EditInPlace } from '@/ui/edit-in-place';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from '../messages';
import { formCopy } from '../form-copy';
import { newQuestion, reorderQuestions, validateForm } from '../model';
import type { Question } from '../types';
import type { FormBuilder } from './form-builder';
import { V11FormSettings } from './v11-form-settings';
import { V11QuestionPreview } from './v11-question-preview';
import { V11QuestionCard } from './v11-question-card';
import { questionTypeLabel } from './v11-question-type';
import { questionCount } from '../question-count';
import { Button } from '@/ui/button';
import { questionIcons, questionTypes, editorButton } from './v11-question-controls';

export function V11FormBuilder({ form, locale, style, status, onChange, onRetry, onDiscard, players, scheduleContext }: ComponentProps<typeof FormBuilder>) {
  const t = createT(workspaceMessages, locale, style), m = formCopy(locale, style);
  const [selected, setSelected] = useState<string | undefined>(form.questions[0]?.id);
  const [dragged, setDragged] = useState<number | null>(null);
  const q = form.questions.find(q => q.id === selected), index = form.questions.findIndex(item => item.id === selected);
  function move(from: number, to: number) { onChange({ ...form, questions: reorderQuestions(form.questions, from, to) }); }
  function remove(id: string) {
    onChange({ ...form, questions: form.questions.filter(q => q.id !== id).map((q, position) => ({ ...q, position })) });
    if (selected === id) setSelected(undefined);
  }
  function update(question: Question) { onChange({ ...form, questions: form.questions.map(q => q.id === question.id ? question : q) }); }
  function add(type: Question['type']) {
    const question = { ...newQuestion(form.id, form.questions.length), type };
    onChange({ ...form, questions: [...form.questions, question] }); setSelected(question.id);
  }
  return <section className="min-w-0">
    <h1 className="sr-only">{form.title}</h1>
    <header className="glass mb-card-gap flex flex-wrap items-center gap-stack rounded-card border border-line-soft p-stack">
      <Link href={`/${locale}/captain/library/forms`} prefetch={false} className={editorButton}>{t('back')}</Link>
      <div className="order-first w-full min-w-0 min-[760px]:order-none min-[760px]:w-auto min-[760px]:flex-1"><EditInPlace label={m.formTitle} value={form.title} onChange={e => onChange({ ...form, title: e.target.value })} /></div>
      <span className="text-xs text-muted">{questionCount(form.questions.length, locale, style)}</span>
      <Button disabled={status === 'saving' || validateForm(form).length > 0} onClick={onRetry} block={false} className="px-page-x">{status === 'saving' ? m.saving : t('save')}</Button>
    </header>
    {status === 'saveError' && <p role="alert" className="mb-stack text-danger">{m.saveError}<button type="button" className={editorButton} onClick={onRetry}>{m.retry}</button>
      <button type="button" className={editorButton} onClick={onDiscard}>{m.discard}</button></p>}
    {validateForm(form).length > 0 && <p role="status" className="mb-stack text-sm text-muted">{m.invalid}</p>}
    <div className="grid items-start gap-stack min-[761px]:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-stack">
        <V11FormSettings form={form} locale={locale} style={style} onChange={onChange} players={players} scheduleContext={scheduleContext} canManage={status === 'saved' && scheduleContext?.ready !== false} />
        {!form.questions.length && <p className="glass rounded-card p-card text-muted">{m.emptyQuestions}</p>}
        {form.questions.map((question, n) => <div key={question.id}
          onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (dragged !== null) move(dragged, n); setDragged(null); }}>
          <div draggable onDragStart={event => {
            if ((event.target as HTMLElement).closest('input, textarea, select')) { event.preventDefault(); return; }
            setDragged(n);
          }} onDragEnd={() => setDragged(null)}>
            <V11QuestionCard question={question} locale={locale} style={style} index={n} count={form.questions.length} open={selected === question.id}
              onToggle={() => setSelected(selected === question.id ? undefined : question.id)} onChange={update} onDelete={() => remove(question.id)} onMove={direction => move(n, n + direction)}
              onDuplicate={() => {
                const copy = { ...structuredClone(question), id: newQuestion(form.id, form.questions.length).id, position: form.questions.length };
                onChange({ ...form, questions: [...form.questions, copy] }); setSelected(copy.id);
              }} />
          </div>
        </div>)}
        <section className="glass rounded-card border border-line-soft p-card"><h2 className="mb-stack text-sm font-semibold">{t('add')}</h2>
          <div className="flex flex-wrap gap-inline">{questionTypes.map(type => {
            const Icon = questionIcons[type];
            return <button key={type} type="button" onClick={() => add(type)} className={editorButton}><Icon aria-hidden className="size-4" />{questionTypeLabel(type, locale, style)}</button>;
          })}</div>
        </section>
      </div>
      <aside className="flex justify-center min-[761px]:sticky min-[761px]:top-20">
        <div className="glass-strong flex w-full min-w-0 flex-col gap-card-gap rounded-[32px] border border-line px-page-x py-page-y min-[760px]:min-h-[420px]">
          <p className="text-xs text-muted">{t('preview')}</p><div className="flex gap-inline" aria-hidden>{form.questions.map((question, n) => <span key={question.id} className={`h-1 flex-1 rounded-full ${n <= index ? 'bg-lime' : 'bg-surface'}`} />)}</div>
          <div className="[&_button]:cursor-pointer [&_button]:active:scale-[.98] [&_button:focus-visible]:ring-2 [&_button:focus-visible]:ring-lime [&_label:has(input)]:cursor-pointer [&_label]:active:scale-[.98] [&_label:focus-within]:ring-2 [&_label:focus-within]:ring-lime">
            {q ? <V11QuestionPreview key={q.id} question={q} locale={locale} style={style} /> : <p className="text-muted">{form.questions.length ? t('selectQuestion') : m.emptyQuestions}</p>}
          </div>
          <button type="button" disabled={!q} onClick={() => setSelected(form.questions[(index + 1) % form.questions.length]?.id)} className={`${editorButton} mt-auto disabled:opacity-40`}>{t('next')}</button>
        </div>
      </aside>
    </div>
  </section>;
}
