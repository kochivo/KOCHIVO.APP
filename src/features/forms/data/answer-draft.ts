import type { AnswerDraft } from '../answers';
type Store = Pick<Storage,'getItem' | 'setItem' | 'removeItem'>;
const key = (id: string) => `kochivo:form-draft:${id}`;
export function readAnswerDraft(id: string, store?: Store): AnswerDraft {
  try {
    const data: unknown = JSON.parse((store ?? localStorage).getItem(key(id)) ?? '{}');
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    const result: AnswerDraft = {};
    for (const [id, answer] of Object.entries(data)) {
      if (!answer || typeof answer !== 'object' || !('value' in answer) || !('photo_paths' in answer)) continue;
      const { value, photo_paths } = answer;
      if (!(value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number'
        || Array.isArray(value) && value.every(v => typeof v === 'string'))
        || !Array.isArray(photo_paths) || !photo_paths.every(p => typeof p === 'string')) continue;
      result[id] = { value, photo_paths };
    }
    return result;
  } catch { return {}; }
}
export function writeAnswerDraft(id: string, draft: AnswerDraft, store?: Store): void {
  try { (store ?? localStorage).setItem(key(id),JSON.stringify(draft)); } catch { /* Storage can be disabled on a shared device. */ }
}
export function clearAnswerDraft(id: string, store?: Store): void {
  try { (store ?? localStorage).removeItem(key(id)); } catch { /* A failed cleanup must not undo a confirmed submission. */ }
}
