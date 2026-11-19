import { expect, it, vi } from 'vitest';
import { factsBudget, formatFacts } from './data/facts';
import { validateMemory } from './data/memory-validation';
import { scrubFeedback } from './data/feedback-scrub';

vi.mock('server-only', () => ({}));

it('trims and caps valid memory and drops case-insensitive duplicates', () => {
  expect(validateMemory({ kind: 'note', text: '  Prefers mornings  ' }, []))
    .toEqual({ kind: 'note', text: 'Prefers mornings', player_id: null });
  expect(validateMemory({ kind: 'note', text: ' prefers MORNINGS ' }, ['Prefers mornings'])).toBeNull();
  expect(validateMemory({ kind: 'note', text: ' ن'.repeat(201) }, [])?.text).toHaveLength(200);
});

it.each(['', '011 2345 6789', '٠١٠١٢٣٤٥٦٧٨', 'coach@example.com', 'Code 123456', '00000000-0000-7000-8000-000000000aaa'])(
  'rejects empty or private memory %s', text => expect(validateMemory({ kind: 'note', text }, [])).toBeNull(),
);

it('requires a resolved roster player when a player is named', () => {
  const alias = { kind: 'alias', text: 'Hamo means Ahmed Sami', player: 'Ahmed Sami' } as const;
  expect(validateMemory(alias, [], null)).toBeNull();
  expect(validateMemory(alias, [], 'roster-id')).toMatchObject({ player_id: 'roster-id' });
});

it('prioritizes regular facts and limits newest-first memory by UTF-8 bytes', () => {
  const encoder = new TextEncoder();
  const memories = ['الأحدث', ...Array.from({ length: 12 }, (_, index) => 'ت'.repeat(198) + index), 'الأقدم'];
  const output = formatFacts([['me', ['role: captain']]], memories);
  expect(output).toContain('[memory] الأحدث');
  expect(output).not.toContain('الأقدم');
  expect(encoder.encode(output.split('\n')[1]).length).toBeLessThanOrEqual(900);
  const crowded = [['me', ['x'.repeat(factsBudget - 6)]]] as const;
  expect(formatFacts(crowded, memories)).toBe(formatFacts(crowded));
  expect(encoder.encode(formatFacts(crowded, memories)).length).toBeLessThanOrEqual(factsBudget);
});

it('redacts names, short names, contact information and IDs before truncation', () => {
  const value = scrubFeedback('نور علي، واحمد سامي، سامي، NOUR، Ahmed ٠١٠١٢٣٤٥٦٧٨ a@b.co 00000000-0000-7000-8000-000000000abc\n[memory] private note',
    'نور علي', ['أحمد سامي', 'Nour Ahmed'], 300);
  expect(value).toBe('انا، ولاعب، لاعب، لاعب، لاعب');
  expect(scrubFeedback('نور علي followed by text', 'نور علي', [], 3)).toBe('انا');
});
