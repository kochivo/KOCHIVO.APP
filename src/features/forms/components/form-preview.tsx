import type { Locale } from '@/core/i18n/locale';
import type { FormDraft } from '../types';
import { messages } from '../messages';
import { QuestionField } from './question-field';

export function FormPreview({ form, locale }: { form: FormDraft; locale: Locale }) {
  return <div>{!form.questions.length && <p className="py-4 text-muted">{messages[locale].emptyQuestions}</p>}
    {form.questions.map(question => <QuestionField key={question.id} question={question} locale={locale} readOnly />)}
  </div>;
}
