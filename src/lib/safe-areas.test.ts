import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(`src/${path}`, 'utf8');

describe('viewport safe areas', () => {
  it('defines vertical insets and preserves Arabic eyebrow joining', () => {
    const css = source('app/globals.css');
    expect(css).toContain('--safe-top: env(safe-area-inset-top, 0px)');
    expect(css).toContain('--safe-bottom: env(safe-area-inset-bottom, 0px)');
    expect(css).toMatch(/:lang\(ar\) \.marketing-eyebrow, \[dir='rtl'\] \.marketing-eyebrow\s*\{\s*letter-spacing: 0;/);
  });

  it.each([
    'features/roster/components/captain-legacy-shell.tsx',
    'features/roster/components/captain-workspace-frame.tsx',
    'features/player-shell/components/player-shell.tsx',
    'features/auth/components/captain-auth-card.tsx',
    'features/auth/components/coach-signup.tsx',
    'features/auth/components/forgot-password-flow.tsx',
    'features/auth/components/player-invite-flow.tsx',
    'features/auth/components/reset-password-form.tsx',
    'features/auth/components/suspended-screen.tsx',
    'features/admin/components/admin-screen.tsx',
    'features/demo/components/demo-screen.tsx',
    'features/coach-page/components/coach-page.tsx',
    'app/[locale]/offline/page.tsx',
  ])('protects the top-level container in %s', path => {
    if (path === 'features/roster/components/captain-legacy-shell.tsx') {
      expect(source(path)).toContain('var(--captain-top-inset)');
      expect(source('app/globals.css')).toContain('--captain-top-inset: max(3rem, var(--safe-top))');
    } else expect(source(path)).toContain('var(--safe-top)');
  });

  it('leaves workout padding with the focus screen', () => {
    const shell = source('features/player-shell/components/player-shell.tsx');
    expect(shell).toContain('className={workout ? undefined');
    expect(source('features/workout/components/focus-screen.tsx')).toContain('env(safe-area-inset-top)');
  });
});
