import { afterEach,expect,it,vi } from 'vitest';
import { readFileSync } from 'node:fs';
vi.mock('server-only',() => ({}));
vi.mock('next/navigation',() => ({notFound:() => {throw new Error('NOT_FOUND');}}));
vi.mock('@/core/supabase/server',() => ({supabaseServer:() => {throw new Error('Unexpected data access');}}));
vi.mock('./server', () => ({ PlayerFormPage: () => null }));
afterEach(() => vi.unstubAllEnvs());
it('keeps the notification destination available while captain workspace discovery is disabled',async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE','0');
  const {default:page} = await import('@/app/[locale]/(player)/player/forms/[requestId]/page');
  await expect(page({params:Promise.resolve({locale:'en',requestId:'r'})})).resolves.toMatchObject({ props: { locale: 'en', requestId: 'r' } });
  const {pendingRequests,playerRequests} = await import('./data/request-actions');
  expect(await pendingRequests()).toEqual([]);
  expect(await playerRequests('p')).toEqual([]);
});
it('gates the home card and workspace manager and keeps the answer flow lazy',() => {
  expect(readFileSync('src/features/player-home/components/home-screen.tsx','utf8')).toContain('captainWorkspaceEnabled() && <PendingForms');
  expect(readFileSync('src/features/captain-workspace/forms/forms-screen.tsx','utf8')).toContain('captainWorkspaceEnabled() && <AssessmentScheduleEntry');
  expect(readFileSync('src/features/forms/components/answer-entry.tsx','utf8')).toContain('dynamic(');
});
