import { afterEach, expect, it, vi } from 'vitest';
import type { Messages } from './messages';

const modules = import.meta.glob<{ messages: Messages }>([
  '../pwa/messages.ts', '../../ui/messages.ts', '../../ui/tour/messages.ts',
  '../../features/auth/messages.ts', '../../features/auth/signup/messages.ts',
  '../../features/marketing/messages.ts', '../../features/onboarding/messages.ts',
  '../../features/captain-approval/intake/messages.ts',
], { eager: true });

afterEach(() => vi.unstubAllEnvs());
it('omits standard dictionaries from message objects when international is disabled', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  for (const [file, { messages }] of Object.entries(modules)) {
    expect(messages.arStd, file).toBeUndefined();
  }
});
it('retains complete standard dictionaries when international is enabled', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  for (const [file, { messages }] of Object.entries(modules)) {
    expect(Object.keys(messages.arStd ?? {}).sort(), file).toEqual(Object.keys(messages.ar).sort());
  }
});
