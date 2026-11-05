import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { ProfileScreen } from './components/profile-screen';

vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'en'), getLocale: async () => 'en' }));
vi.mock('./components/intake-tab', () => ({ IntakeTab: () => null }));
vi.mock('./components/checkins-tab', () => ({ CheckinsTab: () => null }));
vi.mock('./components/plan-tab', () => ({ PlanTab: () => null }));
vi.mock('./components/progress-tab', () => ({ ProgressTab: () => null }));
vi.mock('./components/readiness-loader', () => ({ ReadinessLoader: () => null }));
vi.mock('@/features/muscle-analytics', () => ({ AnalyticsLoader: () => null }));
it.each([null, 'https://example.com/storage/v1/object/public/captain-avatars/p/photo.webp'])('shows a profile avatar or initials and optional WhatsApp for %s', async avatarUrl => {
  const html = renderToStaticMarkup(await ProfileScreen({ playerId: 'p', today: '2026-11-04', tab: 'intake',
    data: Promise.resolve({ data: { name: 'Ali', avatarUrl, phone: avatarUrl ? '+201012345678' : null,
      intake: null, checkIns: [], program: null, nutrition: null } }),
  }));
  if (avatarUrl) {
    expect(html).toContain(`src="${avatarUrl}"`);
    expect(html).toContain('https://wa.me/201012345678');
  } else { expect(html).toContain('>A</span>'); expect(html).not.toContain('wa.me'); }
});
