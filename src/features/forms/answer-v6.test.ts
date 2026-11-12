import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { AnswerFlow } from './components/answer-flow';
import { readAnswerDraft, writeAnswerDraft } from './data/answer-draft';
import type { RequestData } from './request-types';

vi.mock('./data/submit-answers', () => ({ submitAnswers: vi.fn() }));
vi.mock('./data/answer-photos', () => ({ uploadAnswerPhotos: vi.fn() }));
afterEach(() => vi.unstubAllEnvs());
const data = { request: { id: 'r', player_id: 'p', answered_at: null, reviewed_at: null },
  title: 'Weekly', answers: [], questions: [{ id: 'q', form_id: 'f', type: 'photos', position: 0,
    label_ar: 'صوّر نفسك من قدام', label_en: 'Front photo', required: true, options: [], maps_to: null, alert_on: null }],
} as unknown as RequestData;

it('renders camera and gallery actions, step count and offline draft note', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(AnswerFlow, { data, locale: 'ar' })));
  for (const text of ['1 من 1', 'اضغط تصوّر أو تختار صورة', 'capture="user"', 'إجاباتك بتتحفظ لو النت فصل', 'رجوع', 'ابعت الإجابات']) expect(html).toContain(text);
});

it('restores every answer value and uploaded photo reference offline without mixing requests or owners', () => {
  const values = new Map<string, string>();
  const store = { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
  const draft = { number: { value: 76.8, photo_paths: [] }, choice: { value: 'a', photo_paths: [] },
    multi: { value: ['a', 'b'], photo_paths: [] }, yesno: { value: false, photo_paths: [] },
    text: { value: 'ملاحظة', photo_paths: [] }, photo: { value: null, photo_paths: ['p/r/front.jpg'] } };
  writeAnswerDraft('p:r', draft, store);
  expect(readAnswerDraft('p:r', store)).toEqual(draft);
  expect(readAnswerDraft('other:r', store)).toEqual({});
  expect(readAnswerDraft('p:other', store)).toEqual({});
});
