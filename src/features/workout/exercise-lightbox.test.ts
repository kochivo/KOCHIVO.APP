import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { ExerciseLightbox } from './components/exercise-lightbox';

vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'ar') }));

it('makes the exercise GIF a labelled button that opens an enlarged, closable view', () => {
  const html = renderToStaticMarkup(createElement(ExerciseLightbox, { src: 'https://cdn.example/squat.gif', name: 'سكوات' }));
  expect(html).toContain('aria-label="كبّر صورة سكوات"');
  expect(html).toMatch(/<dialog[^>]*aria-label="سكوات"/);
  expect(html).toContain('aria-label="اقفل الصورة"');
  expect(html).toMatch(/<dialog[\s\S]*<img[^>]*alt="سكوات"[^>]*squat\.gif/);
  expect(html).toContain('max-h-[80vh]');
});
