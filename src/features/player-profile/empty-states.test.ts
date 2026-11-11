import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { IntakeTab } from './components/intake-tab';
import { CheckinsTab } from './components/checkins-tab';
import { ProgressTab } from './components/progress-tab';
import { PlanTab } from './components/plan-tab';
vi.mock('@/core/timezone/server', () => ({ getPlayerTimezone: async () => 'Africa/Cairo' }));
vi.mock('@/core/i18n/server', async () => {
 const { createT } = await import('@/core/i18n/messages');
 return { getT: async (messages: Parameters<typeof createT>[0]) => createT(messages, 'en'), getLocale: async () => 'en' };
});
vi.mock('@/features/voice-notes', () => ({ CaptainVoiceNotes: () => null }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/features/onboarding', () => ({ onboardingMessages: { ar: {}, en: {} }, allergyOptions: [], injuryOptions: [], medicalOptions: [] }));
it('offers a reminder button for missing intake', async () => {
 const html = renderToStaticMarkup(await IntakeTab({ intake: null, today: '2026-11-03', playerId: 'p' }));
 expect(html).toContain('>Send a voice reminder</button>');
});
it('offers a reminder button for missing check-ins', async () => {
 const html = renderToStaticMarkup(await CheckinsTab({ playerId: 'p', checkIns: [] }));
 expect(html).toContain('>Send a voice reminder</button>');
});
it('offers reminder buttons for missing weights and photos', async () => {
 const html = renderToStaticMarkup(await ProgressTab({ checkIns: [], targetKg: null, playerId: 'p' }));
 expect(html.match(/>Send a voice reminder<\/button>/g)).toHaveLength(2);
});
it('links missing plans to the correct player builders', async () => {
 const html = renderToStaticMarkup(await PlanTab({ playerId: 'p', program: null, nutrition: null }));
 expect(html).toMatch(/href="\/captain\/players\/p\/programs"[^>]*>Write program<\/a>/);
 expect(html).toMatch(/href="\/captain\/players\/p\/nutrition"[^>]*>Build nutrition plan<\/a>/);
 expect(html).toContain('<h2 class="text-xl font-bold">No program yet</h2>');
});
