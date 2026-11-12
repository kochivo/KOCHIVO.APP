import { afterEach, expect, it, vi } from 'vitest';

vi.mock('next/dynamic', () => ({ default: (load: () => Promise<unknown>) => load }));
vi.mock('./components/billing-screen', () => ({ BillingScreen: 'legacy-billing' }));
vi.mock('./components/workspace-billing', () => ({ WorkspaceBilling: 'workspace-billing' }));
afterEach(() => vi.unstubAllEnvs());
it.each(['0', undefined])('keeps the exact legacy billing implementation with flag %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  const { BillingScreen } = await import('./components/billing-screen-entry');
  expect(await (BillingScreen as unknown as () => Promise<string>)()).toBe('legacy-billing');
});
it('loads the workspace billing only with the workspace flag enabled', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const { BillingScreen } = await import('./components/billing-screen-entry');
  expect(await (BillingScreen as unknown as () => Promise<string>)()).toBe('workspace-billing');
});
