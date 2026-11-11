import { afterEach, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/core/i18n/client';
import { TimezoneContext } from '@/core/timezone/client';
import { VoiceNoteList } from './components/voice-note-list';

afterEach(() => vi.unstubAllEnvs());
it('labels timestamps in the signed-in user day', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  const render = (zone: string) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(TimezoneContext, { value: zone }, createElement(VoiceNoteList, { notes: [{
      id: 'note', contextId: null, createdAt: '2026-01-01T21:30:00Z', listenedAt: null, url: '/note', mimeType: 'audio/webm', durationSeconds: 2,
    }] }))));
  expect(render('Asia/Dubai')).toContain('2 January');
  expect(render('America/New_York')).toContain('1 January');
});
