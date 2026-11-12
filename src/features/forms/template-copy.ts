import { stableId } from '@/core/offline/ids';
import { copyTemplate, newQuestion } from './model';
import { templates } from './templates';
import { messages } from './messages';
import { messages as redesign } from './redesign/messages';
import { createT } from '@/core/i18n/messages';
import type { FormDraft } from './types';
import type { Locale } from '@/core/i18n/locale';

export async function templateCopyForAction(key: string, captain: string, action: string, locale: Locale): Promise<FormDraft> {
  const id = await stableId(captain, action);
  const template = templates.find(t => (t.key ?? t.kind) === key);
  const form = template ? copyTemplate(template, captain, () => id, locale) : {
    id, captain_id: captain, title: messages[locale].newForm, kind: 'custom' as const,
    questions: [newQuestion(id, 0, () => id)], schedule: null, remind_after_hours: null,
  };
  const t = createT(redesign, locale);
  const title = key === 'onboarding' ? t('intake') : key === 'injury' ? t('injury') : key === 'feedback' ? t('feedback') : form.title;
  return { ...form, title, creation_key: action, questions: await Promise.all(form.questions.map(async (q, position) => ({
    ...q, id: await stableId(id, String(position)), form_id: id,
  }))) };
}
