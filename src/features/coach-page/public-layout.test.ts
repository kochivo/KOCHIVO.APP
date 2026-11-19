import { expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { httpsSocialUrl } from './components/public-social-url';
import { PublicCoachLayout } from './components/public-coach-layout';
import { CoachPage } from './components/coach-page';
import { LegacyCoachPage } from './components/legacy-coach-page';
import { messages as sections } from './sections/messages';
import { LocaleProvider } from '@/core/i18n/client';

vi.mock('server-only', () => ({}));
const flags = vi.hoisted(() => ({ enabled: false }));
vi.mock('@/lib/captain-workspace-enabled', () => ({ captainWorkspaceEnabled: () => flags.enabled }));
vi.mock('@/features/billing/server', () => ({ fetchPackageCatalog: async () => ({ tiers: [], packages: [], offers: [] }) }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'en') }));
vi.mock('./data/public-profile', () => ({ loadPublicCoach: async () => ({ id: 'coach', full_name: 'Ahmed Ali', bio: null, avatar: null, location: null, social: {} }) }));
const coach = { id: 'coach', full_name: 'Ahmed Ali', bio: null, avatar: null, avatar_path: null, location: null, social: {} };
const t = createT(messages, 'en');

it('keeps the exact legacy tree with the flag disabled', async () => {
  expect(renderToStaticMarkup(await CoachPage({ slug: 'ahmed' })))
    .toBe(renderToStaticMarkup(await LegacyCoachPage({ slug: 'ahmed' })));
});
it('only accepts absolute HTTPS social URLs', () => {
  expect(httpsSocialUrl('https://wa.me/20100')).toBe('https://wa.me/20100');
  for (const value of [undefined, null, 42, '', '/relative', 'http://wa.me/1', 'javascript:alert(1)', 'bad']) expect(httpsSocialUrl(value)).toBeNull();
});
it('renders missing profile data and reserved empty slots without invented facts', () => {
  const html = renderToStaticMarkup(createElement(PublicCoachLayout, { coach, slug: 'ahmed', t, pricing: null }));
  expect(html).toContain(messages.en.noBio);
  expect(html).toContain(messages.en.noSocial);
  expect(html).toContain('data-slot="specialties"');
  expect(html).toContain('data-slot="numbers"');
  expect(html).toContain('data-slot="spots"');
  expect(html).toContain('data-slot="facts"');
  expect(html).toContain('>A</span>');
  expect(html).not.toContain('data-section="packages"');
});
it.each(['sent', 'member', 'linked'] as const)('replaces all signup actions for %s', requested => {
  const html = renderToStaticMarkup(createElement(PublicCoachLayout, { coach, slug: 'ahmed', t, pricing: null, requested }));
  expect(html).toContain(messages.en[requested]);
  expect(html).not.toContain('name="coach"');
  expect(html.includes('href="/player"')).toBe(requested === 'member');
});
it('uses the first bio paragraph, portrait and safe social links', () => {
  const html = renderToStaticMarkup(createElement(PublicCoachLayout, { coach: { ...coach, avatar: 'https://example.com/avatar', bio: 'First paragraph\n\nFull story', social: { whatsapp: 'https://wa.me/1', instagram: 'http://unsafe.test' } }, slug: 'ahmed', t, pricing: null }));
  expect(html).toContain('https://example.com/avatar');
  expect(html).toContain('>First paragraph</p>');
  expect(html).toContain('Full story');
  expect(html).toContain('https://wa.me/1');
  expect(html).not.toContain('http://unsafe.test');
});
it('selects the new server layout when the flag is enabled', async () => {
  flags.enabled = true;
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  try {
    const html = renderToStaticMarkup(await CoachPage({ slug: 'ahmed' }));
    expect(html).toContain('pt-[var(--safe-top)]');
    expect(html).toContain('id="public-coach-name"');
    expect(html).toContain(messages.en.howTitle);
    expect(html).toContain('data-public-dock');
    expect(html).not.toContain('data-section="packages"');
  } finally { flags.enabled = false; vi.unstubAllEnvs(); }
});
it('provides Egyptian, standard Arabic and English public page copy', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  try {
    expect(createT(messages, 'ar')('requestJoin')).toBe('اطلب تشترك');
    expect(createT(messages, 'ar', 'standard')('requestJoin')).toBe('اطلب الانضمام');
    expect(createT(messages, 'en')('requestJoin')).toBe('Request to join');
    expect(createT(messages, 'ar', 'standard')('bonusOfferLabel', { name: 'عرض', n: 7, count: 7 })).toBe('عرض · 7 أيام هدية');
  } finally { vi.unstubAllEnvs(); }
});
it('fills the named slots with this captain’s data and replaces all three full-capacity actions', () => {
  const page = { specialties: ['Strength'], years_experience: 8, languages: ['ar' as const],
    show_public_stats: true, spots_left: 0, accepting: false, coach_gender: null };
  const node = createElement(PublicCoachLayout, { coach: { ...coach, page,
    stats: { players: 12, workouts_logged: 4210, adherence_pct: 87, member_since: 2020 } },
    slug: 'ahmed', t, sectionsT: createT(sections, 'en'), pricing: null });
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, node));
  expect(html).toContain('Strength'); expect(html).toContain('4,210');
  expect(html).toContain(sections.en.full); expect(html).toContain(sections.en.honesty);
  expect(html.match(/Notify me when a spot opens/g)).toHaveLength(3);
  expect(html).not.toContain('name="coach"');
});
