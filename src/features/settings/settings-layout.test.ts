import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { CaptainSettings } from './components/captain-settings';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('@/core/resource', () => ({ useResource: () => ({ data: {
  full_name: 'Ali', timezone: 'Africa/Cairo', timezone_auto: true, units: 'metric',
}, mutate() {} }) }));
vi.mock('@/features/demo', () => ({ demoExpiry: () => null, useDemoExpiry: () => null }));
vi.mock('@/features/billing', () => ({ SubscriptionEntry: () => null }));
vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: null }) }));
vi.mock('./data/workspace-settings', () => ({ loadCaptainSettings() {} }));
vi.mock('./data/language', () => ({ saveLanguage() {} }));
vi.mock('./data/preferences', () => ({ saveCaptainPreferences() {} }));

it('renders one language and timezone card with its editable controls', () => {
  const html = renderToStaticMarkup(createElement(CaptainSettings));
  expect(html.match(/اللغة والتوقيت/g)).toHaveLength(1);
  expect(html).not.toContain('اللغة والوقت');
  expect(html).toContain('English');
  expect(html).toContain('aria-pressed');
});
