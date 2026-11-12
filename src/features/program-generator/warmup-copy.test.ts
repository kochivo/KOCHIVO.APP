import { expect, it } from 'vitest';
import { toProgramDraft } from './generate';
import type { GeneratedProgram } from './generate';

it('carries source warm-up through acceptance into a saved draft', () => {
  const warmup = { items: [{ id: '019ab800-0000-7000-8000-000000000001', name: 'Walk',
    amount: 5, unit: 'min' as const }], ramp: true };
  const generated: GeneratedProgram = { player_id: null, title: '', status: 'draft', days: [{
    title: 'Day', position: 1, weekday: 0, exercises: [], warmup,
  }] };
  const draft = toProgramDraft(generated, 'program', 'Plan', () => 'day');
  expect(draft.days[0]?.warmup).toEqual({ items: [{ id: '019ab800-0000-7000-8000-000000000001',
    name: 'Walk', amount: 5, unit: 'min' }], ramp: true });
  expect(generated.days[0]?.warmup).toEqual(warmup);
});
