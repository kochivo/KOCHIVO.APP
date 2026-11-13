import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CaptainThread } from './components/captain-thread';
import { captainThread } from './player-thread';

vi.mock('@/lib/use-calendar-clock', () => ({ useCalendarClock: () => ({ now: new Date('2026-11-13T10:00:00Z') }) }));
it('renders real captain-only content with day separators and accessible playback', () => {
  const items = captainThread([{ id: 'v', contextId: null, createdAt: '2026-11-13T08:00:00Z',
    url: '/voice.webm', durationSeconds: 24, listenedAt: null }],
  [{ id: 'r', captain_reply: 'Actual captain reply', reviewed_at: '2026-11-12T08:00:00Z' }]);
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(CaptainThread, { items })));
  expect(html).toContain('امبارح');
  expect(html).toContain('النهارده');
  expect(html.indexOf('Actual captain reply')).toBeLessThan(html.indexOf('/voice.webm'));
  expect(html).toContain('aria-label="شغّل الرسالة الصوتية"');
  expect(html).toContain('0:24');
  expect(html).not.toContain('تمام يا كابتن');
  expect(html).not.toContain('77.5');
});
