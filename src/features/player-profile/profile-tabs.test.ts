import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { profileTabs } from './model';
import { ProfileTabs } from './components/profile-tabs';

it.each(['ar', 'en'] as const)('keeps all six tabs in one segmented bar in %s', locale => {
  for (const tab of profileTabs) {
    const html = renderToStaticMarkup(ProfileTabs({ tab, t: createT(messages, locale) }));
    const primary = html.match(/<div data-profile-segments="true"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
    expect([...primary.matchAll(/href="\?tab=([^"]+)"/g)].map(m => m[1])).toEqual(['intake', 'progress', 'plan', 'checkins', 'analysis', 'readiness']);
    expect(html).toContain('href="?tab=analysis"');
    expect(html).toContain('href="?tab=readiness"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toContain(createT(messages, locale)(`tab.${tab}`));
  }
});
