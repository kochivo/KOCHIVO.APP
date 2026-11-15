import { readFileSync, readdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GlassCard } from './glass-card';
import { Button, buttonClass } from './button';
import { PageContainer } from './page-container';
import { EditInPlace } from './edit-in-place';

const read = (path: string) => readFileSync(path, 'utf8');
const referenceSpacing: Record<string, readonly string[]> = {
  'marketing/components/hero-phones.tsx': ['p-3'],
  'marketing/components/hero.tsx': ['p-3'],
  'marketing/components/site-header.tsx': ['px-4'],
  'marketing/components/stats-strip.tsx': ['gap-6', 'p-7'],
  'marketing/components/story-screens.tsx': ['gap-3', 'p-3', 'py-3', 'gap-1', 'ms-4'],
  'demo/guided/guide-card.tsx': ['gap-1'],
  'demo/guided/weight-chart.tsx': ['ms-4'],
  'demo/guided/workout.tsx': ['ms-4'],
};

describe('spacing system', () => {
  it('defines the mobile scale and the 760px desktop scale', () => {
    const css = read('src/app/globals.css');
    for (const [name, value] of Object.entries({ 'page-x': '1rem', 'page-y': '1rem', section: '1.5rem', card: '1rem', 'card-gap': '.75rem', stack: '.5rem', inline: '.5rem' })) {
      expect(css).toContain(`--spacing-${name}: ${value};`);
    }
    expect(css).toMatch(/@media \(min-width: 760px\)/);
    expect(css).toContain('--spacing-section: 2rem;');
  });

  it('uses scale tokens in cards, controls and the page frame', () => {
    expect(renderToStaticMarkup(createElement(GlassCard))).toContain('p-card');
    expect(renderToStaticMarkup(createElement(GlassCard))).not.toContain('md:p-6');
    expect(renderToStaticMarkup(createElement(Button))).toContain('px-control');
    expect(renderToStaticMarkup(createElement(PageContainer))).toContain('px-page-x');
    expect(read('src/features/roster/components/captain-workspace-frame.tsx')).toContain('px-page-x');
    expect(read('src/features/player-shell/components/player-shell.tsx')).toContain('px-page-x');
    expect(buttonClass({ className: 'text-title' })).not.toContain('text-sm');
  });

  it('keeps approved demo sizing and lets non-interactive comparison rows fit their content', () => {
    const demo = read('src/features/demo/guided/guided.css');
    // The global scale already gives 20px/16px from 760px; pinning them in the demo made the 390px frame overflow.
    expect(demo).not.toContain('--spacing-card:');
    expect(demo).toContain('.demo-captain-main { grid-template-columns: minmax(0, 1fr);');
    expect(demo).toContain('.demo-shell .control-md.px-control');
    expect(demo).not.toContain('.demo-shell .control-md {');
    expect(demo).toContain('.demo-shell input.px-page-x, .demo-intro input.px-page-x { padding-inline: 16px; }');
    expect(demo).toContain('.demo-workout-steppers svg.p-inline { padding: 6px; }');
    expect(demo).toContain('.demo-shell .captain-chip { block-size: var(--spacing-touch); padding-inline: 16px; }');
    const landing = read('src/features/marketing/components/landing.module.css');
    const row = landing.match(/\.comparison li\s*\{([^}]+)\}/)?.[1];
    expect(row).toBeDefined();
    expect(row).not.toMatch(/min-(?:block-size|height)/);
    expect(landing).toContain(".headerEnd :global([role='group']) { gap: 4px; }");
    expect(landing).toContain(".headerEnd :global([role='group']) button { padding-inline: 12px; }");
    expect(read('src/features/roster/components/players-empty-state.tsx')).not.toContain('min-h-[clamp');
    expect(read('src/features/billing/components/player-waiting-room.tsx')).not.toContain('min-h-80');
  });

  it('keeps text clear of overlaid editing and social icons', () => {
    const input = renderToStaticMarkup(createElement(EditInPlace, { label: 'Name', defaultValue: 'A long meal name' }));
    expect(input).toContain('pe-touch');
    expect(read('src/features/settings/components/social-links-fields.tsx')).toContain('pe-touch');
    expect(read('src/features/programs/components/exercise-picker.tsx')).toContain('ps-touch');
  });

  it('rejects off-scale padding, gaps and margins in application components', () => {
    const violations: string[] = [];
    for (const root of ['src/ui', 'src/features', 'src/app']) {
      for (const file of readdirSync(root, { recursive: true }).map(String).filter(file => file.endsWith('.tsx'))) {
        if (/legacy|admin|[\\/]dev[\\/]/.test(file)) continue;
        const content = read(`${root}/${file}`);
        // Zero resets, overlay clearance and safe-area calculations are structural.
        for (const match of content.matchAll(/(?<![\w-])(?:p[xysebt]?|m[xysebt]?|gap(?:-[xy])?|space-[xy])-(\d+(?:\.\d+)?|\[\d+(?:\.\d+)?px\])(?![\w.\]-])/g)) {
          const raw = match[1] ?? '';
          const value = raw.startsWith('[') ? Number(raw.slice(1, -3)) : Number(raw) * 4;
          const approved = referenceSpacing[file.replaceAll('\\', '/')]?.includes(match[0]);
          if (value > 0 && value < 64 && !approved) violations.push(`${file}: ${match[0]}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps app typography on the scale, with approved reference sizes exempt', () => {
    const violations: string[] = [];
    for (const root of ['src/features', 'src/app']) {
      for (const file of readdirSync(root, { recursive: true }).map(String).filter(file => file.endsWith('.tsx'))) {
        const content = read(`${root}/${file}`).replace(/<svg\b[\s\S]*?<\/svg>/g, '');
        if (/text-\[\d+(?:\.\d+)?px\]/.test(content)) violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });
});
