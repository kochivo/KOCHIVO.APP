import { expect, it } from 'vitest';
import { readAnswerDraft, writeAnswerDraft, clearAnswerDraft } from './data/answer-draft';
import { answerRows, validAnswer, matchesAlert } from './answers';
import { stableId } from '@/core/offline/ids';
import type { Question } from './types';

const q: Question = { id: 'q', form_id: 'f', position: 0, label_ar: '', label_en: '', type: 'yesno',
  required: true, options: [], maps_to: null, alert_on: { operator: 'eq', value: true } };
it('persists request-scoped drafts, restores them and tolerates blocked or corrupted storage', () => {
  const map = new Map<string,string>();
  const store = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string,v: string) => { map.set(k,v); }, removeItem: (k: string) => { map.delete(k); } };
  const draft = { q: { value: false, photo_paths: [] } };
  writeAnswerDraft('p:r',draft,store);
  expect(readAnswerDraft('p:r',store)).toEqual(draft);
  expect(readAnswerDraft('p:other',store)).toEqual({});
  store.setItem('kochivo:form-draft:broken','{broken');
  expect(readAnswerDraft('broken',store)).toEqual({});
  clearAnswerDraft('p:r',store);
  expect(readAnswerDraft('p:r',store)).toEqual({});
  const blocked = { ...store, getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  expect(readAnswerDraft('r',blocked)).toEqual({});
  expect(() => writeAnswerDraft('r',draft,blocked)).not.toThrow();
  expect(() => clearAnswerDraft('r',{...store,removeItem:() => {throw new Error('blocked');}})).not.toThrow();
});
it('uses stable answer ids and preserves false and zero', async () => {
  const rows = await answerRows('r',[q],{ q: { value: false, photo_paths: [] } });
  expect(rows[0]).toEqual({ id: await stableId('r','q'), request_id: 'r', question_id: 'q', value: false, photo_paths: [] });
  expect(validAnswer(q,false)).toBe(true);
  expect(validAnswer({...q,type:'number'},0)).toBe(true);
  expect(validAnswer({...q,type:'number'},'invalid')).toBe(false);
  expect(validAnswer({...q,type:'scale'},11)).toBe(false);
  expect(matchesAlert(q.alert_on,true)).toBe(true);
  expect(matchesAlert(q.alert_on,false)).toBe(false);
});
