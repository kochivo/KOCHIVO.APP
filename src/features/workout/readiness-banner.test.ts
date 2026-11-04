import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CoachReductionBanner } from '@/features/readiness';
import { FocusScreen } from './components/focus-screen';

vi.mock('next/dynamic', () => ({ default: (loader: () => unknown) =>
  String(loader).includes('CoachReductionBanner') ? CoachReductionBanner : () => null,
}));

vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-04T10:00:00Z'), online: true }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {} }) }));
vi.mock('./hooks/use-wake-lock', () => ({ useWakeLock() {} }));
vi.mock('./hooks/use-focus-session', () => ({ useFocusSession: () => ({
  decision: 'reduce', day: null, rest: { remaining: 0, endsAt: null }, doneSets: [], loading: true,
}) }));

it('shows the coach reduction banner in focus mode', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(FocusScreen, { dayId: 'day', playerId: 'player' })));
  expect(html).toContain('Your coach cut today&#x27;s workout by 20%');
});
