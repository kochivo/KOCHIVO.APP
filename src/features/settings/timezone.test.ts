import { afterEach, expect, it, vi } from 'vitest';
import { settingsSchemas } from './schema';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/core/i18n/client';
import { TimezoneFields } from './components/timezone-fields';

afterEach(() => vi.unstubAllEnvs());
it('accepts a pinned player timezone only with international enabled', () => {
  const input = { full_name: 'Player', phone: '', timezone: 'Asia/Dubai', timezone_auto: false };
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(settingsSchemas(undefined, true).profileSchema.parse(input)).toMatchObject({ timezone: 'Asia/Dubai', timezone_auto: false });
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  expect(settingsSchemas(undefined, true).profileSchema.parse(input)).not.toHaveProperty('timezone_auto');
  expect(settingsSchemas(undefined, true).profileSchema.parse({ ...input, timezone: 'bad', timezone_auto: 'ignored' }))
    .toEqual({ full_name: 'Player', phone: null });
});
it('accepts UTC from automatic detection for captain saves', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(settingsSchemas().captainProfileSchema.safeParse({ full_name: 'Coach', bio: '', location: '',
    timezone: 'UTC', timezone_auto: true, units: 'metric', social: {} }).success).toBe(true);
});
it('renders no timezone UI with the flag off, and a translated switch and disabled automatic picker with it on', () => {
  const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' },
    createElement(TimezoneFields, { timezone: 'Asia/Dubai', auto: true, onChange: () => undefined })));
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
  expect(render()).toBe('');
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(render()).toContain('تلقائي');
  expect(render()).toMatch(/role="switch" aria-checked="true"/);
  expect(render()).toMatch(/<select[^>]*disabled/);
});
