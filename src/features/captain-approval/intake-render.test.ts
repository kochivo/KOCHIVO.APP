import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { IntakeForm } from './components/intake-form';

vi.mock('./data/intake', () => ({ saveIntake: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
it.each(['ar', 'en'] as const)('renders named radio groups and required contacts in %s', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(IntakeForm, { fullName: 'Ali' })));
  expect(html).toContain('value="Ali"');
  expect(html).toMatch(/<input(?=[^>]*name="full_name")(?=[^>]*required="")[^>]*>/);
  expect(html).toMatch(/type="tel"[^>]*required=""/);
  expect(html).not.toMatch(/<input(?=[^>]*name="instagram")(?=[^>]*required="")[^>]*>/);
  for (const name of ['current_tool', 'main_challenge', 'players_range']) {
    expect(html).toContain(`role="radiogroup" aria-labelledby="${name}-label"`);
    expect(html).toContain(`id="${name}-label"`);
    expect(html.match(new RegExp(`name="${name}"`, 'g'))).toHaveLength(3);
  }
  expect(html.match(/type="radio"/g)).toHaveLength(9);
  expect(html).toContain('type="submit"');
  expect(html).toContain(locale === 'en' ? 'Send request' : 'إرسال الطلب');
});
