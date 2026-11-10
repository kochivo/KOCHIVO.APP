import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkServerEntry, checkSurfaceImports } from './shared-surface-imports';

const client = "'use client'; export function Screen() { return null; }";
const barrel = 'src/features/example/index.ts';
const surface = 'src/app/example/layout.tsx';
function fixture(source: string, exports = "export { Screen } from './components/screen';", leaf = client) {
  const files = new Map([[barrel, exports], ['src/features/example/components/screen.tsx', leaf]]);
  return checkSurfaceImports(surface, source, path => files.get(path));
}

describe('shared surface feature imports', () => {
  it('rejects a static client export with the surface, export and fix', () => {
    const errors = fixture("import { Screen as Alias } from '@/features/example';");
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain(surface);
    expect(errors[0]).toContain('Screen');
    expect(errors[0]).toContain('-entry.tsx');
  });

  it('allows type-only imports, including inline types', () => {
    expect(fixture("import type { Screen } from '@/features/example'; import { type Screen as Props } from '@/features/example';")).toEqual([]);
  });

  it('allows the server-only public entry in shared surfaces', () => {
    expect(fixture("import { fetchData } from '@/features/example/server';")).toEqual([]);
  });

  it('allows server exports and entry/loader wrappers', () => {
    expect(fixture("import { Screen } from '@/features/example';", undefined, 'export function Screen() {}')).toEqual([]);
    for (const suffix of ['entry', 'loader']) {
      const files = new Map([[barrel, `export { Screen } from './components/screen-${suffix}';`],
        [`src/features/example/components/screen-${suffix}.tsx`, client]]);
      expect(checkSurfaceImports(surface, "import { Screen } from '@/features/example';", path => files.get(path))).toEqual([]);
    }
  });

  it('allows dynamic and lazy imports within the surface', () => {
    expect(fixture("import dynamic from 'next/dynamic'; const Screen = dynamic(() => import('@/features/example').then(m => m.Screen));")).toEqual([]);
    expect(fixture("import React from 'react'; const Screen = React.lazy(() => import('@/features/example').then(m => ({ default: m.Screen })));")).toEqual([]);
  });

  it('follows renamed, chained and star re-exports', () => {
    for (const exports of ["export { Screen as Renamed } from './bridge';", "export * from './bridge';"]) {
      const files = new Map([[barrel, exports], ['src/features/example/bridge.ts', "export { Screen } from './components/screen';"],
        ['src/features/example/components/screen.tsx', client]]);
      const name = exports.includes('Renamed') ? 'Renamed' : 'Screen';
      expect(checkSurfaceImports(surface, `import { ${name} } from '@/features/example';`, path => files.get(path))).toHaveLength(1);
    }
  });

  it('checks default and namespace imports and does not mistake comments for directives', () => {
    expect(fixture("import Screen from '@/features/example';", "export { Screen as default } from './components/screen';")).toHaveLength(1);
    expect(fixture("import * as Example from '@/features/example';")).toHaveLength(1);
    expect(fixture("import { Screen } from '@/features/example';", undefined, `/* header */\n${client}`)).toHaveLength(1);
    expect(fixture("import { Screen } from '@/features/example';", undefined, "// 'use client';\nexport function Screen() {}" )).toEqual([]);
  });

  it('fails closed on unresolved exports', () => {
    expect(fixture("import { Missing } from '@/features/example';")).toHaveLength(1);
  });

  it('keeps every shared surface free of static client barrel imports', () => {
    function walk(directory: string): string[] {
      return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = `${directory}/${entry.name}`;
        return entry.isDirectory() ? walk(path) : [path];
      });
    }
    const surfaces = walk('src/app').filter(path => /\/(?:layout|template|opengraph-image)\.tsx$/.test(path));
    surfaces.push('src/app/global-error.tsx', 'src/features/player-shell/components/player-shell.tsx',
      'src/features/roster/components/captain-shell.tsx');
    const read = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : undefined;
    expect(surfaces.flatMap(path => checkSurfaceImports(path, readFileSync(path, 'utf8'), read))).toEqual([]);
  });
});

describe('server-only feature entries', () => {
  const entry = 'src/features/example/server.ts';
  const source = "import 'server-only'; export { fetchData } from './data/loader';";
  const leaf = 'src/features/example/data/loader.ts';
  it('allows only re-exports of explicitly server-only modules', () => {
    expect(checkServerEntry(entry, source, path => path === leaf ? "import 'server-only'; export function fetchData() {}" : undefined)).toEqual([]);
  });
  it('rejects client code, unmarked modules, missing modules and inline exports', () => {
    for (const text of [client, "// import 'server-only';\nexport function fetchData() {}", undefined,
      "'use client'; import 'server-only'; export function fetchData() {}",
      "'use server'; import 'server-only'; export async function fetchData() {}"])
      expect(checkServerEntry(entry, source, path => path === leaf ? text : undefined)).not.toEqual([]);
    expect(checkServerEntry(entry, "export function fetchData() {}", () => undefined)).not.toEqual([]);
    expect(checkServerEntry(entry, `'use server'; ${source}`, path => path === leaf ? "import 'server-only';" : undefined)).not.toEqual([]);
  });
  it('checks every feature server.ts without running feature code', () => {
    const entries = readdirSync('src/features').map(name => `src/features/${name}/server.ts`).filter(existsSync);
    expect(entries).toContain('src/features/billing/server.ts');
    const read = (path: string) => existsSync(path) ? readFileSync(path, 'utf8') : undefined;
    expect(entries.flatMap(path => checkServerEntry(path, readFileSync(path, 'utf8'), read))).toEqual([]);
  });
});
