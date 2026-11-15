import { Button } from '@/ui/button';
import { KoPlus } from '@/ui/icons/ko-plus';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { lazy, Suspense } from 'react';
import Link from 'next/link';
import { CloudCheck, Plus } from 'lucide-react';
import { createT } from '@/core/i18n/messages';
import { uuidv7 } from '@/core/offline/ids';
import { messages } from '../messages';
import { formCopy } from '../form-copy';
import { messages as redesign } from '../redesign/messages';
import { newQuestion, reorderQuestions, validateForm } from '../model';
import type { FormDraft, Question } from '../types';
import type { ScheduleContext } from '../schedule-context';
import { QuestionEditor } from './question-editor';
import { LibrarySchedulesEntry } from './library-schedules-entry';
import { SaveStatus } from '@/ui/save-status';

const FormPreview = lazy(() => import('./form-preview').then(module => ({ default: module.FormPreview })));

export function FormBuilder({ form, locale, status, preview, onChange, onPreview, onRetry, onDiscard, players = 0, style, scheduleContext }: {
  form: FormDraft; locale: Locale; status: 'saved' | 'pending' | 'saving' | 'saveError'; preview: boolean; players?: number; style?: ArabicStyle;
  onChange: (form: FormDraft) => void; onPreview: () => void; onRetry: () => void; onDiscard?: () => void;
  scheduleContext?: ScheduleContext;
}) {
  const PlusIcon = captainWorkspaceEnabled() ? KoPlus : Plus;
  const m = formCopy(locale, style), t = createT(redesign, locale, style), invalid = validateForm(form).length > 0;
  function add(kind?: 'weight' | 'sleep' | 'energy' | 'photos' | 'note') {
    let q = newQuestion(form.id, form.questions.length);
    if (kind) q = { ...q, label_ar: kind === 'energy' ? redesign.ar.energyQuestion : messages.ar.labels[kind],
      label_en: '', type: kind === 'weight' ? 'number' : kind === 'sleep' || kind === 'energy' ? 'scale' : kind === 'photos' ? 'photos' : 'text',
      maps_to: kind === 'weight' ? 'weight' : kind === 'note' ? 'note' : null };
    onChange({ ...form, questions: [...form.questions, q] });
  }
  function duplicate(q: Question, index: number) {
    const next = structuredClone(q); next.id = uuidv7();
    const questions = [...form.questions]; questions.splice(index + 1, 0, next);
    onChange({ ...form, questions: questions.map((q, position) => ({ ...q, position })) });
  }
  return <section className="min-w-0">
    <h1 className="sr-only">{form.title}</h1>
    <header className="mb-[18px] flex flex-wrap items-center gap-[14px]">
      <div className="me-auto min-w-0 flex-1">
        <Link href={`/${locale}/captain/library/forms`} prefetch={false} className="inline-flex min-h-12 items-center text-xs text-lime hover:underline focus-visible:underline">{m.title}</Link>
        <input aria-label={m.formTitle} value={form.title} onChange={e => onChange({ ...form, title: e.target.value })}
          className="block min-h-12 w-full min-w-0 bg-transparent font-display text-[30px] font-semibold leading-tight" />
      </div>
      {invalid ? <span role="status" className="text-sm text-muted">{m.invalid}</span>
        : status === 'saved' ? <span role="status" className="flex items-center gap-2 text-xs text-faint"><CloudCheck aria-hidden className="size-4 text-lime" />{t('saved')}</span>
          : <SaveStatus locale={locale} status={status === 'saveError' ? 'error' : 'saving'} onRetry={onRetry} />}
      {(invalid || status === 'saveError') && onDiscard && <Button variant="secondary" type="button" className="min-h-12 px-3" onClick={onDiscard}>{m.discard}</Button>}
      <Button type="button" variant={'secondary'} block={false} className={"min-h-12 px-5 text-[12.5px]"} onClick={onPreview}>{preview ? m.back : m.preview}</Button>
    </header>
    <div className={preview ? 'mx-auto max-w-md' : 'grid items-start gap-[18px] min-[1001px]:grid-cols-[minmax(0,1fr)_340px]'}>
      {!preview && <div className="min-w-0">
        <LibrarySchedulesEntry form={form} locale={locale} onChange={onChange} players={players} style={style} scheduleContext={scheduleContext} canManage={status === 'saved' && scheduleContext?.ready !== false} />
        {!form.questions.length && <p className="glass rounded-card p-5 text-faint">{m.emptyQuestions}</p>}
        {form.questions.map((q, index) => <QuestionEditor key={q.id} question={q} locale={locale} index={index} count={form.questions.length} style={style}
          onChange={question => onChange({ ...form, questions: form.questions.map(q => q.id === question.id ? question : q) })}
          onDelete={() => onChange({ ...form, questions: form.questions.filter(item => item.id !== q.id).map((q, position) => ({ ...q, position })) })}
          onMove={direction => onChange({ ...form, questions: reorderQuestions(form.questions, index, index + direction) })}
          onDuplicate={() => duplicate(q, index)} />)}
        <div className="glass flex flex-wrap items-center gap-[10px] rounded-card border border-dashed border-line px-[18px] py-3 text-faint">
          <Button variant="secondary" type="button" className="me-auto flex min-h-12 items-center gap-2 text-sm" onClick={() => add()}><PlusIcon aria-hidden className="size-4" />{m.add}</Button>
          {(['weight', 'sleep', 'energy', 'photos', 'note'] as const).map(kind => <button key={kind} type="button" onClick={() => add(kind)}
            className="flex min-h-12 items-center gap-1 rounded-full bg-surface px-[10px] text-[11.5px] text-muted"><PlusIcon aria-hidden className="size-3" />{t(kind === 'photos' ? 'progressPhotos' : kind)}</button>)}
        </div>
      </div>}
      <aside className="min-w-0 min-[1001px]:sticky min-[1001px]:top-[75px]">
        <p className="mb-2 text-[11px] text-faint">{t('preview')}</p>
        <Suspense fallback={<p role="status" className="glass-strong rounded-card p-5">{m.loading}</p>}><FormPreview form={form} locale={locale} style={style} /></Suspense>
      </aside>
    </div>
  </section>;
}
