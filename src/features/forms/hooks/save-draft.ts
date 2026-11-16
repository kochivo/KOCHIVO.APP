import type { FormDraft } from '../types';

export async function saveDraft(form: FormDraft, write: (form: FormDraft) => Promise<{ ok: boolean; error?: 'answeredQuestion' }>,
  active: () => boolean, onSaved: (form: FormDraft) => void): Promise<void> {
  const result = await write(form);
  if (!result.ok) throw new Error(result.error ?? 'Form save failed');
  if (active()) onSaved(form);
}
