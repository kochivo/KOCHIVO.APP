import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CoachPage } from './components/coach-page';
import { messages } from './messages';
import { coachSlug, coachSignupHref } from './slug';
import { coachMetadata } from './metadata';
import { siteMetadata } from '@/app/[locale]/site-metadata';
import { parseCoachRequestStatus } from '@/lib/coach-request-status';

const mock = vi.hoisted(() => ({ locale: 'en' as 'ar' | 'en' }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({
  getT: async () => (key: keyof typeof messages.en) => messages[mock.locale][key],
}));
vi.mock('./data/public-profile', () => ({
  loadPublicCoach: async () => ({ full_name: 'Ahmed', bio: null, avatar: null, location: null, social: {} }),
}));

it.each(['ar', 'en'] as const)('renders honest states and a 48px member home link in %s', async locale => {
  mock.locale = locale;
  for (const requested of ['sent', 'member', 'linked'] as const) {
    const html = renderToStaticMarkup(await CoachPage({ slug: 'ahmed', requested }));
    expect(html).toContain('role="status"');
    expect(html).toContain(messages[locale][requested]);
    expect(html).not.toContain(messages[locale].train);
    expect(html).not.toContain('/login?');
    if (requested === 'member') {
      expect(html).toContain('href="/player"');
      expect(html).toContain(messages[locale].openApp);
      expect(html).toMatch(/<a[^>]*class="[^"]*min-h-12/);
    } else expect(html).not.toContain('href="/player"');
  }
});
it('shows the normal Join link for an unknown status', async () => {
  mock.locale = 'en';
  const html = renderToStaticMarkup(await CoachPage({ slug: 'ahmed', requested: parseCoachRequestStatus('junk') }));
  expect(html).toContain(messages.en.train);
  expect(html).not.toContain('role="status"');
});

it('accepts public slugs and rejects reserved or malformed links', () => {
  expect(coachSlug('ahmed-1')).toBe('ahmed-1');
  for (const slug of ['admin', 'api', 'login', 'ab', 'A'.repeat(3), 'a'.repeat(31), '../x', null]) expect(coachSlug(slug)).toBeNull();
  expect(coachSignupHref('ahmed')).toBe('/login?tab=signup&coach=ahmed');
});
it.each(['ar', 'en'] as const)('includes localized titles, descriptions and explicit share images for %s', locale => {
  const root = siteMetadata(locale);
  expect(root.title).toBeTruthy();
  expect(root.description).toBeTruthy();
  expect(String(root.metadataBase)).toBe('https://kochivo.site/');
  expect(root.openGraph?.images).toBeTruthy();
  expect(root.twitter).toMatchObject({ card: 'summary_large_image', images: expect.any(Array) });
  const coach = coachMetadata(locale, 'ahmed', { full_name: 'Ahmed', bio: 'Strength coach' });
  expect(coach.title).toBe('Ahmed');
  expect(coach.description).toBe('Strength coach');
  expect(coach.openGraph).toMatchObject({ images: [{ url: '/c/ahmed/opengraph-image', width: 1200, height: 630 }] });
  expect(coach.twitter).toMatchObject({ card: 'summary_large_image', images: ['/c/ahmed/opengraph-image'] });
});
