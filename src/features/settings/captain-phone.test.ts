import { readFileSync } from 'node:fs';
import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import type * as React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import type { Messages } from '@/core/i18n/messages';
import { CaptainPhoneSettingsMenu } from './components/captain/phone-settings-menu';
import type { SettingsProfile } from './schema';

const { setStatus } = vi.hoisted(() => ({ setStatus: vi.fn() }));
vi.mock('react', async original => ({
  ...await original<typeof React>(),
  useState: () => [undefined, setStatus],
  useSyncExternalStore: (_: unknown, __: unknown, server: () => boolean) => server(),
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: (messages: Messages) => createT(messages, 'en') }));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('keeps the desktop navigation and existing section grid while adding a phone overview', () => {
  const source = readFileSync(new URL('./components/captain-settings.tsx', import.meta.url), 'utf8');
  expect(source).toContain('CaptainPhoneSettingsMenu');
  expect(source).toContain('md:hidden');
  expect(source).toContain('min-[760px]:grid-cols-[minmax(0,1fr)_minmax(0,3.4fr)]');
  expect(source).toContain('<SectionNav section={section}');
  expect(source).toContain('<SecuritySection profile={profile}');
});

it.each([true, false])('reports clipboard outcomes for the actual public join URL (success=%s)', async success => {
  const writeText = success ? vi.fn().mockResolvedValue(undefined) : vi.fn().mockRejectedValue(new Error('clipboard'));
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  const profile = { full_name: 'Ali', public_slug: 'coach-ali' } as SettingsProfile;
  const menu = CaptainPhoneSettingsMenu({ profile, query: '', timezone: 'Africa/Cairo' });
  function copyAction(value: ReactNode): (() => Promise<void>) | undefined {
    for (const child of Children.toArray(value)) {
      if (!isValidElement<{ children?: ReactNode; onClick?: () => Promise<void> }>(child)) continue;
      if (child.props.children === 'Copy') return child.props.onClick;
      const nested = copyAction(child.props.children);
      if (nested) return nested;
    }
  }
  const copy = copyAction(menu);
  if (!copy) throw new Error('Missing copy action');
  await copy();
  expect(writeText).toHaveBeenCalledWith('https://kochivo.site/c/coach-ali');
  expect(setStatus).toHaveBeenCalledWith(success ? 'copied' : 'copyFailed');
});
