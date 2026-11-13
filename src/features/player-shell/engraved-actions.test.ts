import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { CaptainQuestion } from './components/captain-question';

afterEach(() => vi.unstubAllEnvs());

it.each(['0', '1'])('keeps the voice action label with flag %s', flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  const html = renderToStaticMarkup(createElement(CaptainQuestion));
  expect(html.includes('<pattern')).toBe(flag === '1');
  expect(html.includes('lucide-mic')).toBe(flag === '0');
  expect(html).toContain('aria-label="افتح واتساب عشان تسجّل للكابتن"');
  expect(html).toContain('disabled=""');
});
