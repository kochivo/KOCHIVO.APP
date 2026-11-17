import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it.each(['captain-nav-groups.tsx', 'captain-frame-nav-view.tsx'])(
  'disables viewport and hover prefetch for captain navigation in %s', file => {
    const source = readFileSync(`src/features/roster/components/${file}`, 'utf8');
    const links = source.match(/<Link\b[^>]*>/g) ?? [];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toContain('prefetch={false}');
  },
);

it('loads the legacy shell only after selecting the flag-off path', () => {
  const shell = readFileSync('src/features/roster/components/captain-shell.tsx', 'utf8');
  expect(shell).toContain("await import('./captain-legacy-shell')");
  expect(shell).not.toMatch(/import\s+\{\s*CaptainLegacyShell\s*\}\s+from/u);
  expect(shell).not.toContain("from './captain-nav'");
  expect(shell.indexOf('if (captainWorkspaceEnabled())')).toBeLessThan(shell.indexOf("await import('./captain-legacy-shell')"));
});

it('defers the account menu links until interaction and avoids the roster dictionary', () => {
  const menu = readFileSync('src/features/roster/components/captain-account-menu.tsx', 'utf8');
  expect(menu).toContain("dynamic(() => import('./captain-account-content')");
  expect(menu).toContain('loaded && <CaptainAccountContent');
  expect(menu).not.toContain("from '../messages'");
  expect(menu).not.toContain("from '@/core/i18n'");
  const bar = readFileSync('src/features/roster/components/captain-top-bar.tsx', 'utf8');
  expect(bar).not.toContain("from '@/features/");
  expect(readFileSync('src/features/roster/components/captain-frame-model.ts', 'utf8')).not.toContain("from '@/ui/icons'");
});
