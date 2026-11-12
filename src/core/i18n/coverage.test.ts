import { afterAll, describe, expect, it, vi } from 'vitest';
import { relative, resolve } from 'node:path';
import type { Messages } from './messages';

const modules = import.meta.glob<Record<string, unknown>>(
  ['../../**/messages.ts', '../../**/*-messages.ts'], { eager: true },
);
vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
afterAll(() => vi.unstubAllEnvs());
const required = /^(ui\/|core\/|features\/(marketing|auth|onboarding|roster|captain-workspace|programs|templates|program-generator|meal-plans|inbox|billing|dashboard|coach-page|rank-review|captain-approval)\/)/;
const playerFeatures = new Set([
  'player-shell', 'player-home', 'workout', 'nutrition', 'supplements', 'progress', 'readiness',
  'body-scans', 'muscle-analytics', 'ranks', 'notifications', 'player-profile', 'voice-notes', 'forms',
  'settings', 'demo', 'install', 'feedback', 'share-card', 'ko-core', 'ko-entry', 'ko-account', 'ko-preview',
]);
function leaves(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) =>
    Object.entries(leaves(child, prefix ? `${prefix}.${key}` : key))));
}
const placeholders = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort();
const rows = Object.entries(modules).flatMap(([path, module]) => Object.values(module)
  .filter((value): value is Messages => !!value && typeof value === 'object' && 'ar' in value && 'en' in value)
  .map((messages) => {
  const file = relative(resolve('src'), resolve(import.meta.dirname, path)).replaceAll('\\', '/');
  const translated = Object.keys(leaves(messages.arStd)).length;
  const total = Object.keys(leaves(messages.ar)).length;
  return { file, messages, translated, total, coverage: `${translated}/${total}` };
}));

describe('standard Arabic coverage per messages file', () => {
  it('omits player standard dictionaries when the international flag is off', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0');
    try {
      for (const { file, messages } of rows) {
        if (playerFeatures.has(file.split('/')[1] ?? '')) expect(messages.arStd, file).toBeUndefined();
      }
    } finally {
      vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
    }
  });
  it.each(rows)('$file: $coverage', ({ file, messages, translated, total }) => {
    if (required.test(file) || playerFeatures.has(file.split('/')[1] ?? '')) {
      expect(translated, `${file} must have full standard coverage`).toBe(total);
    }
    const egyptian = leaves(messages.ar);
    for (const [key, value] of Object.entries(leaves(messages.arStd))) {
      expect(Object.hasOwn(egyptian, key), `${file}: unknown standard key ${key}`).toBe(true);
      expect(placeholders(value), `${file}: ${key} placeholders`).toEqual(placeholders(egyptian[key] ?? ''));
    }
  });
});
