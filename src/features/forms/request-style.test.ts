import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { RequestPicker } from './components/request-picker';

vi.mock('server-only', () => ({}));

afterEach(() => vi.unstubAllEnvs());
it('renders standard Arabic assessment copy and a shared submit button', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const markup = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar', style: 'standard' },
    createElement(RequestPicker, { forms: [], playerId: 'player', locale: 'ar', now: new Date('2026-11-16T00:00Z'),
      onSent: () => {}, onCancel: () => {}, onSend: async () => true })));
  expect(markup).toContain('اختر تقييماً');
  expect(markup).toMatch(/type="submit"[^>]*class="[^"]*control-primary/);
});
