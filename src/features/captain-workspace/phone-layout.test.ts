import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('captain phone editor layout', () => {
  it('reserves compact tracks for warm-up actions and a full row for the add field', () => {
    const row = source('features/captain-workspace/training/warmup-row.tsx');
    expect(row).toContain('grid-cols-[48px_minmax(0,1fr)_48px]');
    expect(row).toContain('size-12');
    expect(row).not.toContain('hidden min-h-12');
    expect(source('features/captain-workspace/training/warmup-block.tsx')).toContain('col-span-full');
  });

  it('gives meal names their own full header row and keeps menu and expand controls separate', () => {
    expect(source('features/meal-plans/components/editor/meal-card.tsx')).toContain('col-span-full min-w-0');
    expect(source('features/meal-plans/components/editor/meal-menu.tsx')).not.toContain('<DisclosureChevron');
  });

  it('puts food names and macros above the amount controls on narrow cards', () => {
    expect(source('features/meal-plans/components/editor/food-row.tsx')).toContain('col-span-full min-w-0 break-words');
    expect(source('features/meal-plans/components/editor/food-row.tsx')).toContain('whitespace-nowrap');
  });

  it('clears the floated preview legend before laying out the number and unit', () => {
    expect(source('features/forms/components/question-field.tsx')).toContain('clear-both flex min-w-0');
    expect(source('features/forms/components/v11-form-builder.tsx')).not.toContain('flex min-h-[420px]');
  });

  it('lets the assessment title span the phone header', () => {
    expect(source('features/forms/components/v11-form-builder.tsx')).toContain('order-first w-full min-w-0');
  });

  it('shares floating-control clearance and masks the installed status bar', () => {
    const frame = source('features/roster/components/captain-workspace-frame.tsx');
    expect(frame).toContain('captain-content');
    expect(frame).toContain('h-[var(--safe-top)]');
    const css = source('app/globals.css');
    expect(css).toContain('--captain-content-clearance:');
    expect(css).toContain('padding-block-end: var(--captain-content-clearance)');
  });
});
