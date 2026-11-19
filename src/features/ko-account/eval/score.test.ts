import { describe, expect, it } from 'vitest';
import type { Intent } from '../data/intents';
import type { KoEvalCase } from './cases';
import { koEvalCases } from './cases';
import { matchCase, normalize, renderReport, summarize } from './score';
import type { EvalResult } from './score';

const bench: KoEvalCase = {
  id: 'bench', role: 'captain', tag: 'clear', text: 'Set bench to 4 sets',
  expect: 'update_exercise', args: { exercise: 'ضغط|بَنْش', sets: 4 },
};
const update: Intent = { kind: 'update_exercise', args: { exercise: 'بار بنش', sets: 4, reps: 10 } };
const clarify: Intent = { kind: 'clarify', args: { question: 'How many sets?' } };
const ambiguous: KoEvalCase = { ...bench, id: 'ambiguous', expect: 'clarify', tag: 'ambiguous', args: undefined };

describe('normalize', () => {
  it('folds Arabic text and digits and trims lowercase English', () => {
    expect(normalize('  أَإِآـةٌى ١٢٣ EXT ۴  ')).toBe('اااهي 123 ext 4');
  });
});

describe('matchCase', () => {
  it('requires the me citation on identity cases for both roles', () => {
    const cases = koEvalCases.filter(testCase => testCase.id.startsWith('me-') && testCase.source === 'me');
    expect(cases).toHaveLength(16);
    for (const testCase of cases) {
      expect(matchCase(testCase, { kind: 'answer', args: { text: 'Hi Nour.', sources: ['me'] } }).outcome).toBe('pass');
      expect(matchCase(testCase, { kind: 'answer', args: { text: 'Hi Nour.', sources: ['me', 'team_summary'] } }).outcome).toBe('bad_args');
    }
  });
  it('matches normalized alternatives, exact numbers, and allowed tools', () => {
    expect(matchCase({ ...bench, expect: ['read_exercise', 'update_exercise'] }, update))
      .toEqual({ tool: true, args: true, outcome: 'pass' });
  });

  it('requires exact booleans and rejects missing or incorrect arguments', () => {
    const read: Intent = { kind: 'read_exercise', args: { exercise: 'bench', how: false } };
    const testCase: KoEvalCase = { ...bench, expect: 'read_exercise', args: { how: true } };
    expect(matchCase(testCase, read)).toEqual({ tool: true, args: false, outcome: 'bad_args' });
    expect(matchCase({ ...testCase, args: { how: false } }, read).outcome).toBe('pass');
    expect(matchCase(bench, { kind: 'update_exercise', args: { exercise: 'بنش' } }).outcome).toBe('bad_args');
    expect(matchCase(bench, { kind: 'update_exercise', args: { ...update.args, sets: 3 } }).outcome).toBe('bad_args');
  });

  it('classifies null calls, tool mismatches, false clarifications, and unsafe actions', () => {
    expect(matchCase(bench, null)).toEqual({ tool: false, args: false, outcome: 'no_call' });
    expect(matchCase(ambiguous, { kind: 'team_summary', args: {} }))
      .toEqual({ tool: false, args: true, outcome: 'wrong_tool' });
    expect(matchCase(bench, clarify).outcome).toBe('false_clarify');
    expect(matchCase(ambiguous, update).outcome).toBe('unsafe_action');
    expect(matchCase({ ...ambiguous, expect: ['clarify', 'update_exercise'] }, update).outcome).toBe('pass');
  });
});

describe('summarize', () => {
  it('aggregates unsorted latency, outcome counts, category scores, and token usage', () => {
    const player: KoEvalCase = { ...bench, id: 'player', role: 'player', expect: 'my_progress', args: undefined };
    const results: EvalResult[] = [
      { case: bench, got: update, outcome: 'pass', ms: 100, tokens: { prompt: 12, output: 4, thinking: 2, total: 18 } },
      { case: player, got: clarify, outcome: 'false_clarify', ms: 10, tokens: { prompt: 8, output: 4, thinking: 0, total: 12 } },
      { case: ambiguous, got: update, outcome: 'unsafe_action', ms: 50, tokens: { prompt: 16, output: 8, thinking: 6, total: 30 } },
      { case: { ...player, id: 'timeout' }, got: null, outcome: 'no_call', ms: 20, tokens: { prompt: 0, output: 0, thinking: 0, total: 0 }, error: 'timeout' },
    ];
    const summary = summarize(results);
    expect(summary.totals).toEqual({
      count: 4, pass: 1, passPercent: 25,
      outcomes: { pass: 1, false_clarify: 1, unsafe_action: 1, wrong_tool: 0, bad_args: 0, no_call: 1 },
    });
    expect(summary.byTag).toEqual({ clear: expect.closeTo(100 / 3), ambiguous: 0 });
    expect(summary.byRole).toEqual({ captain: 50, player: 0 });
    expect(summary.clarifyRate).toBe(25);
    expect(summary.latency).toEqual({ p50: 20, p95: 100 });
    expect(summary.tokens).toEqual({
      total: { prompt: 36, output: 16, thinking: 8, total: 60 },
      average: { prompt: 9, output: 4, thinking: 2, total: 15 },
    });
    expect(summary.failures).toContainEqual({
      id: 'ambiguous', text: ambiguous.text, expected: { kind: 'clarify', args: undefined },
      got: update, outcome: 'unsafe_action', error: undefined,
    });
    const report = renderReport(summary, { model: 'test-model', date: '2026-01-01', runCount: 4 });
    expect(report).toContain('## Unsafe actions');
    expect(report).toContain(JSON.stringify(update));
    expect(report).toContain('timeout');
    expect(report).toContain('| bench | 100 | 12 | 4 | 2 | 18 |');
  });

  it('returns zero for empty inputs', () => {
    const summary = summarize([]);
    expect(summary.totals.passPercent).toBe(0);
    expect(summary.latency).toEqual({ p50: 0, p95: 0 });
    expect(summary.tokens.average).toEqual({ prompt: 0, output: 0, thinking: 0, total: 0 });
  });
});
