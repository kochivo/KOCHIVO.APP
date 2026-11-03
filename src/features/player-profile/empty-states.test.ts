import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { IntakeTab } from './components/intake-tab';
import { CheckinsTab } from './components/checkins-tab';
import { ProgressTab } from './components/progress-tab';
import { PlanTab } from './components/plan-tab';
vi.mock('@/core/i18n/server', async () => {
 const { createT } = await import('@/core/i18n/messages');
 return { getT: async (messages: Parameters<typeof createT>[0]) => createT(messages, 'en'), getLocale: async () => 'en' };
});
vi.mock('@/features/voice-notes', () => ({ CaptainVoiceNotes: () => null }));
vi.mock('@/features/onboarding', () => ({ onboardingMessages: { ar: {}, en: {} }, allergyOptions: [], injuryOptions: [], medicalOptions: [] }));
vi.mock('@/features/progress', () => ({ LineChart: () => null }));
it('links missing intake to the player reminder recorder', async () => {
 const html = renderToStaticMarkup(await IntakeTab({ intake: null, today: '2026-11-03', playerId: 'p' }));
 expect(html).toContain('href="/captain/players/p?tab=checkins#voice-recorder-p"');
 expect(html).toContain('>Send a voice reminder</a>');
});
it('links missing check-ins to the recorder on this tab', async () => {
 const html = renderToStaticMarkup(await CheckinsTab({ playerId: 'p', checkIns: [] }));
 expect(html).toMatch(/href="#voice-recorder-p"[^>]*>Send a voice reminder<\/a>/);
});
it('links missing weights and photos to a check-in reminder', async () => {
 const html = renderToStaticMarkup(await ProgressTab({ checkIns: [], targetKg: null, playerId: 'p' }));
 expect(html.match(/href="\/captain\/players\/p\?tab=checkins#voice-recorder-p"/g)).toHaveLength(2);
});
it('links missing plans to the correct player builders', async () => {
 const html = renderToStaticMarkup(await PlanTab({ playerId: 'p', program: null, nutrition: null }));
 expect(html).toMatch(/href="\/captain\/players\/p\/programs"[^>]*>Write program<\/a>/);
 expect(html).toMatch(/href="\/captain\/players\/p\/nutrition"[^>]*>Build nutrition plan<\/a>/);
 expect(html).toContain('<h2 class="text-xl font-bold">No program yet</h2>');
});
