import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { QueueState } from './queue-state';
it.each(['ar', 'en'] as const)('shows distinct translated empty, loading and retryable error states in %s', locale => {
  const render = (kind: 'empty' | 'loading' | 'error') => renderToStaticMarkup(createElement(QueueState, { kind, locale, retry: () => {} }));
  expect(render('loading')).toContain('role="status"');
  expect(render('empty')).toContain(locale === 'en' ? 'No requests here' : 'مفيش طلبات هنا');
  expect(render('error')).toContain('role="alert"');
  expect(render('error')).toContain(locale === 'en' ? 'Try again' : 'جرّب تاني');
});
