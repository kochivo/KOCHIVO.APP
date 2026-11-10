import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { DonePanel } from './components/done-panel';
import { SessionFeedback } from './components/session-feedback';

const workout = { startedAt: '2026-11-10T10:00:00Z', completedAt: '2026-11-10T10:20:00Z',
  loggedSets: 6, plannedSets: 10, plannedSeconds: 2000 };

for (const locale of ['ar', 'en'] as const) {
  const render = (changes = {}, lifetime?: number) => renderToStaticMarkup(createElement(LocaleProvider, { locale },
    createElement(DonePanel, { workout: { ...workout, ...changes }, lifetime })));
  it(`renders expected workout points and cached next tier in ${locale}`, () => {
    const html = render({}, 85);
    expect(html).toContain(locale === 'ar' ? 'هيتحسب' : 'Expected');
    expect(html).toContain('+3');
    expect(html).toContain(locale === 'ar' ? '15 نقطة على بطل' : '15 points to Champion');
  });
  it(`renders the minimum duration in ${locale}`, () => {
    const html = render({ completedAt: '2026-11-10T10:19:59Z' });
    expect(html).toContain(locale === 'ar' ? 'أقل من 20 دقيقة' : 'under 20 minutes');
    expect(html).toContain('text-muted');
  });
  it(`renders missing sets in ${locale}`, () => {
    expect(render({ loggedSets: 5 })).toContain(locale === 'ar' ? 'سجّلت 5 من 10 مجموعة، محتاج 6' : 'you logged 5 of 10 sets, 6 needed');
  });
  it(`omits the next tier when unknown or at Legend in ${locale}`, () => {
    for (const lifetime of [undefined, 600]) {
      expect(render({}, lifetime)).not.toContain(locale === 'ar' ? 'فاضلك' : 'points to');
    }
  });
  it(`keeps the preview after the feedback step in ${locale}`, () => {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale },
      createElement(SessionFeedback, { sessionId: 'session', hasFeedback: true, workout })));
    expect(html).toContain(locale === 'ar' ? 'هيتحسب +3' : 'Expected: +3');
  });
}
