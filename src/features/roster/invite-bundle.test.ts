import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const manifest = resolve('.next/server/app/[locale]/(captain)/captain/players/[playerId]/programs/page_client-reference-manifest.js');
const inviteManifest = resolve('.next/server/app/[locale]/(captain)/captain/players/new/page_client-reference-manifest.js');

// Like the gzip budget, this checks real production output when a build is available.
it.skipIf(!existsSync(manifest))('keeps unused invite and player gate entries out of the captain training route', () => {
  const source = readFileSync(manifest, 'utf8').replaceAll('\\\\', '/');
  for (const entry of ['/roster/components/invite-page-entry.tsx', '/forms/components/form-preview-entry.tsx',
    '/player-shell/components/start-gate-boundary.tsx']) expect(source.includes(entry), entry).toBe(false);
});

it.skipIf(!existsSync(inviteManifest))('retains the invite entry on its own route', () => {
  const source = readFileSync(inviteManifest, 'utf8');
  expect(source.includes('/roster/components/invite-page-entry.tsx')).toBe(true);
});
