import { afterAll, describe, expect, it, vi } from 'vitest';
import { relative, resolve } from 'node:path';
import type { Messages } from './messages';

const modules = import.meta.glob<{ messages: Messages }>('../../**/messages.ts', { eager: true });
vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
afterAll(() => vi.unstubAllEnvs());
const required = /^(ui\/|core\/|features\/(marketing|auth|onboarding)\/|features\/captain-approval\/intake\/)/;
const placeholders = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort();
const rows = Object.entries(modules).filter(([, module]) => module.messages).map(([path, { messages }]) => {
  const file = relative(resolve('src'), resolve(import.meta.dirname, path)).replaceAll('\\', '/');
  const translated = Object.keys(messages.arStd ?? {}).length;
  const total = Object.keys(messages.ar).length;
  return { file, messages, translated, total, coverage: `${translated}/${total}` };
});

describe('standard Arabic coverage per messages file', () => {
  it.each(rows)('$file: $coverage', ({ file, messages, translated, total }) => {
    if (required.test(file)) expect(translated, `${file} must have full standard coverage`).toBe(total);
    for (const [key, value] of Object.entries(messages.arStd ?? {})) {
      expect(Object.hasOwn(messages.ar, key), `${file}: unknown standard key ${key}`).toBe(true);
      expect(placeholders(value), `${file}: ${key} placeholders`).toEqual(placeholders(messages.ar[key] ?? ''));
    }
  });
});
