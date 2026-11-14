import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('keeps the blocking theme script outside the client-safe theme decision module', () => {
  const mode = readFileSync('src/lib/theme-mode.ts', 'utf8');
  expect(mode).not.toContain('themeBootScript');
  expect(mode).not.toContain('localStorage');
  const boot = readFileSync('src/lib/theme-boot-script.ts', 'utf8');
  expect(boot).toContain("import 'server-only'");
  expect(boot).toContain("from './theme-mode'");
  expect(readFileSync('src/app/[locale]/layout.tsx', 'utf8')).toContain("from '@/lib/theme-boot-script'");
});
