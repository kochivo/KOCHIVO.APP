import { afterEach, expect, it, vi } from 'vitest';
import { captainWorkspaceEnabled } from './captain-workspace-enabled';

afterEach(() => vi.unstubAllEnvs());
it('enables the workspace only for the exact public flag value 1', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '');
  for (const flag of [undefined, '', '0', 'true', 'yes', ' 1', '1 ']) {
    expect(captainWorkspaceEnabled(flag)).toBe(false);
  }
  expect(captainWorkspaceEnabled('1')).toBe(true);
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(captainWorkspaceEnabled()).toBe(true);
});
