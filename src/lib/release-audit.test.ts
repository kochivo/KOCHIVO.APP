import { afterEach, describe, expect, it, vi } from 'vitest';
import { scanFile, scanRoutes } from '../../scripts/release-audit-rules.mjs';
import DevLayout from '../app/[locale]/dev/layout';

vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('404'); } }));
afterEach(() => vi.unstubAllEnvs());

describe('release audit', () => {
  it('rejects debug output', () => {
    expect(scanFile('src/example.ts', 'console.' + 'log(1)')).toHaveLength(1);
  });
  it.each([
    ['.env.local', '', 'tracked-env'],
    ['.env.example', 'API_TOKEN=FAKE', 'example-secret'],
    ['notes.md', 'sk_' + 'live_FAKE', 'secret'],
    ['notes.md', 'sb_' + 'secret_FAKE', 'secret'],
    ['notes.md', 'sk_' + 'test_FAKE', 'secret'],
    ['notes.md', 'eyJ' + 'FAKE'.repeat(8) + '.' + 'FAKE'.repeat(8) + '.' + 'FAKE'.repeat(8), 'secret'],
    ['notes.md', '-----BEGIN RSA PRIVATE' + ' KEY-----', 'secret'],
    ...['AKIA', 'ghp_', 'github_pat_', 'sntrys_', 're_', '0x4AAAAAAA'].map(prefix => ['notes.md', prefix + 'FAKE'.repeat(prefix === 'AKIA' ? 4 : 8), 'secret']),
    ['src/a.ts', 'debug' + 'ger;', 'debugger'],
    ['src/a.tsx', '"#abcdef"', 'hex-color'],
    ['src/a.ts', 'https://fake.supabase' + '.co', 'supabase-url'],
    ['src/a.test.ts', 'it.' + 'only(() => {})', 'focused-test'],
    ...['a.log', 'a.bak', 'a.orig', 'a.tmp', 'a.png', 'a.jpg', 'playwright-report/a', 'test-results/a', 'supabase/.temp/a'].map(file => [file, '', 'stray-file']),
  ])('detects %s (%s)', (file, value, rule) => {
    expect(scanFile(file, value).map(finding => finding.rule)).toContain(rule);
    expect(scanFile('src/clean.ts', 'export const value = 1;')).toEqual([]);
  });
  it('allows public values and empty example secrets', () => {
    expect(scanFile('.github/workflows/checks.yml', 'NEXT_PUBLIC_KEY: sb_publishable_FAKE')).toEqual([]);
    expect(scanFile('.env.example', 'SECRET=""\nPASSWORD=\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=FAKE')).toEqual([]);
    expect(scanFile('src/app/[locale]/layout.tsx', "themeColor: '#abcdef'")).toEqual([]);
  });
  it('requires each restricted page to guard itself, not only its layout', () => {
    for (const segment of ['dev', 'debug', 'test', 'playground']) {
      const page = `src/app/[locale]/${segment}/ui/page.tsx`;
      const files = new Map([[page, ''], [`src/app/[locale]/${segment}/layout.tsx`, "if (process.env.NODE_ENV !== 'development') notFound();"]]);
      expect(scanRoutes(files)).toHaveLength(1);
      files.set(page, "if (process.env.NODE_ENV !== 'development') notFound();");
      expect(scanRoutes(files)).toEqual([]);
    }
  });
  it('blocks production and test environments', () => {
    for (const env of ['production', 'test']) {
      vi.stubEnv('NODE_ENV', env);
      expect(() => DevLayout({ children: 'child' })).toThrow('404');
    }
  });
  it('renders development children', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(DevLayout({ children: 'child' })).toBe('child');
  });
});
