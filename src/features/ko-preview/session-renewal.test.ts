import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import type { KoFeedItem } from '@/features/ko-feed';
import { FeedCard, feedHref } from './components/feed-card';

it.each(['ar', 'arStd', 'en'] as const)('routes session expiry to player billing controls in %s', locale => {
  const routeLocale = locale === 'arStd' ? 'ar' : locale;
  for (const kind of ['expiring', 'expired'] as const) {
    for (const sessions of [0, 3]) {
      const item: KoFeedItem = { key: kind, kind, severity: 'urgent', player_id: 'player',
        player_name: 'Ali', data: { sessions_left: sessions } };
      expect(feedHref(item, routeLocale)).toBe(`/${routeLocale}/captain/players/player`);
      const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: routeLocale, style: locale === 'arStd' ? 'standard' : 'egyptian' },
        createElement(FeedCard, { item, onDismiss() {} })));
      expect(html).toContain(`href="/${routeLocale}/captain/players/player"`);
      expect(html).not.toContain('<form');
      expect(feedHref({ ...item, data: { sessions_left: null } }, routeLocale)).toBeNull();
    }
  }
});
