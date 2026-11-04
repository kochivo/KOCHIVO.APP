import { expect, it } from 'vitest';
import { coachSlug, coachSignupHref } from './slug';
import { coachMetadata } from './metadata';
import { siteMetadata } from '@/app/[locale]/site-metadata';

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
