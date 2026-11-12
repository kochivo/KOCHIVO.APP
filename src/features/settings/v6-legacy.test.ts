import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { SettingsScreen } from './components/settings-screen';
import { NotificationDropdown } from '../notifications/components/notification-dropdown';
import { AnswerFlow } from '../forms/components/answer-flow';
import { PlayerSupplements } from '../supplements/components/player-supplements';
import { ChipGroup } from '../onboarding/components/chip-group';
import type { RequestData } from '../forms/request-types';
import type { useNotifications } from '../notifications/hooks/use-notifications';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/player/settings', useRouter: () => ({ refresh() {}, push() {} }) }));
vi.mock('./data/settings', () => ({ loadSettings: vi.fn() }));
vi.mock('./data/language', () => ({ saveLanguage: vi.fn() }));
vi.mock('../forms/data/submit-answers', () => ({ submitAnswers: vi.fn() }));
vi.mock('../forms/data/answer-photos', () => ({ uploadAnswerPhotos: vi.fn() }));
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
const request = { request: { id: 'r', player_id: 'p', answered_at: null, reviewed_at: null },
  title: 'Weekly', answers: [], questions: [{ id: 'q', form_id: 'f', type: 'number', position: 0,
    label_ar: 'الوزن', label_en: 'Weight', required: true, options: [], maps_to: null, alert_on: null }],
} as unknown as RequestData;
const notifications: ReturnType<typeof useNotifications> = { rows: [{ id: 'n', type: 'plan_assigned',
  payload: { name: 'Plan' }, is_read: false, created_at: '2026-11-12T10:00:00Z' }], count: 1,
  status: 'ready', pending: false, saveError: false, refresh: async () => {}, read: async () => true };

it('preserves original account, notifications, assessment, supplements and intake option markup', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-12T11:00:00Z'));
  const results = (['ar', 'en'] as const).map(locale => [createElement(SettingsScreen),
    createElement(NotificationDropdown, { openerId: 'bell', notifications, onClose() {} }),
    createElement(AnswerFlow, { data: request, locale }), createElement(PlayerSupplements),
    createElement(ChipGroup, { label: 'Injuries', options: [{ key: 'none', label: 'none' }], value: [], onChange() {} }),
  ].map(element => createHash('sha256').update(renderToStaticMarkup(createElement(LocaleProvider, { locale }, element))).digest('hex')));
  expect(results).toMatchSnapshot();
});
