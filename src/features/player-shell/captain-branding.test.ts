import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { CaptainScreen } from './components/captain-screen';
import { LocaleProvider } from '@/core/i18n/client';

vi.mock('./hooks/use-my-captain', () => ({ useCaptainContext: () => ({ status: 'ready', retry() {}, data: {
  fullName: 'Ali', bio: 'Strength coach', location: 'Cairo', avatarUrl: 'https://example.com/avatar.webp',
  accessUntil: '2026-11-30', archivedAt: null, startedOn: null,
  social: { instagram: 'https://instagram.com/ali', youtube: '', x: 'javascript:alert(1)', whatsapp: 'https://wa.me/201012345678' },
} }) }));
it('shows branding and only safe nonempty contact links with new-tab protection', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(CaptainScreen)));
  expect(html).toContain('Strength coach'); expect(html).toContain('Cairo');
  expect(html).toContain('https://example.com/avatar.webp');
  expect(html).toContain('href="https://instagram.com/ali" target="_blank" rel="noopener noreferrer"');
  expect(html).toContain('https://wa.me/201012345678');
  expect(html).not.toContain('javascript:'); expect(html).not.toContain('YouTube');
  expect(html).not.toContain('/player/settings');
});
vi.mock('server-only', () => ({}));
