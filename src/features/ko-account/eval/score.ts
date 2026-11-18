import type { Intent } from '../data/intents';
import type { KoEvalCase } from './cases';

type Outcome = 'pass' | 'wrong_tool' | 'bad_args' | 'no_call' | 'false_clarify' | 'unsafe_action';
export type TokenCounts = { prompt: number; output: number; thinking: number; total: number };
export type EvalResult = {
  case: KoEvalCase;
  outcome: Outcome;
  got: Intent | null;
  ms: number;
  tokens: TokenCounts;
  error?: string;
};

const mutations = new Set<Intent['kind']>([
  'update_exercise', 'create_training', 'create_nutrition', 'renew_subscription', 'send_reminder', 'swap_exercise',
]);

export function normalize(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ـ|(?=\p{Script_Extensions=Arabic})\p{Mark}/gu, '')
    .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
    .trim();
}

export function matchCase(testCase: KoEvalCase, intent: Intent | null): {
  tool: boolean; args: boolean; outcome: Outcome;
} {
  if (!intent) return { tool: false, args: false, outcome: 'no_call' };
  const expected = typeof testCase.expect === 'string' ? [testCase.expect] : testCase.expect;
  const tool = expected.includes(intent.kind);
  const actualArgs: Record<string, unknown> = intent.args;
  const args = Object.entries(testCase.args ?? {}).every(([key, value]) => {
    const actual = actualArgs[key];
    if (!Object.hasOwn(actualArgs, key) || actual === undefined) return false;
    if (typeof value !== 'string') return actual === value;
    const normalized = normalize(String(actual));
    return value.split('|').some(alternative => normalized.includes(normalize(alternative)));
  });
  if (!tool) {
    if (intent.kind === 'clarify') return { tool, args, outcome: 'false_clarify' };
    if (expected.includes('clarify') && mutations.has(intent.kind)) return { tool, args, outcome: 'unsafe_action' };
    return { tool, args, outcome: 'wrong_tool' };
  }
  return { tool, args, outcome: args ? 'pass' : 'bad_args' };
}

function percent(count: number, total: number): number {
  return total ? count / total * 100 : 0;
}

function groupPassRates(results: readonly EvalResult[], key: 'tag' | 'role'): Record<string, number> {
  const groups = new Map<string, { count: number; pass: number }>();
  for (const result of results) {
    const label = result.case[key];
    const group = groups.get(label) ?? { count: 0, pass: 0 };
    group.count++;
    if (result.outcome === 'pass') group.pass++;
    groups.set(label, group);
  }
  return Object.fromEntries(Array.from(groups, ([label, group]) => [label, percent(group.pass, group.count)]));
}

export function summarize(results: readonly EvalResult[]) {
  const count = results.length;
  const outcomes: Record<Outcome, number> = {
    pass: 0, wrong_tool: 0, bad_args: 0, no_call: 0, false_clarify: 0, unsafe_action: 0,
  };
  const total: TokenCounts = { prompt: 0, output: 0, thinking: 0, total: 0 };
  const tokenKeys = ['prompt', 'output', 'thinking', 'total'] as const;
  for (const result of results) {
    outcomes[result.outcome]++;
    for (const key of tokenKeys) total[key] += result.tokens[key];
  }
  const average = { ...total };
  if (count) for (const key of tokenKeys) average[key] /= count;
  const latencies = results.map(result => result.ms).sort((a, b) => a - b);
  const failures = results.filter(result => result.outcome !== 'pass').map(result => ({
    id: result.case.id, text: result.case.text,
    expected: { kind: result.case.expect, args: result.case.args },
    got: result.got, outcome: result.outcome, error: result.error,
  }));
  return {
    totals: { count, pass: outcomes.pass, passPercent: percent(outcomes.pass, count), outcomes },
    byTag: groupPassRates(results, 'tag'),
    byRole: groupPassRates(results, 'role'),
    clarifyRate: percent(results.filter(result => result.got?.kind === 'clarify').length, count),
    latency: { p50: latencies[Math.ceil(count * 0.5) - 1] ?? 0, p95: latencies[Math.ceil(count * 0.95) - 1] ?? 0 },
    tokens: { total, average },
    failures,
    messages: results.map(result => ({ id: result.case.id, ms: result.ms, tokens: result.tokens })),
  };
}

type Summary = ReturnType<typeof summarize>;
type ReportMeta = { model: string; date: string; runCount: number };

function failureLines(failures: Summary['failures']): string[] {
  return failures.length ? failures.flatMap(failure => [
    `- **${failure.id}** (${failure.outcome}) ${failure.text}`,
    `  - Expected: \`${JSON.stringify(failure.expected)}\``,
    `  - Got: \`${JSON.stringify(failure.got)}\``,
    ...(failure.error ? [`  - Error: ${failure.error}`] : []),
  ]) : ['None.'];
}

function passRateLines(rates: Record<string, number>): string[] {
  return Object.entries(rates).map(([label, rate]) => `| ${label} | ${rate.toFixed(1)}% |`);
}

export function renderReport(summary: Summary, meta: ReportMeta): string {
  const { count, pass, passPercent, outcomes } = summary.totals;
  const { total, average } = summary.tokens;
  return [
    '# KO baseline eval', '',
    `- Model: ${meta.model}`,
    `- Date: ${meta.date}`,
    `- Cases run: ${meta.runCount}`,
    `- Passed: ${pass}/${count} (${passPercent.toFixed(1)}%)`,
    `- Clarify rate: ${summary.clarifyRate.toFixed(1)}%`,
    `- Latency: p50 ${summary.latency.p50} ms, p95 ${summary.latency.p95} ms`, '',
    '## Outcomes', '',
    ...Object.entries(outcomes).map(([outcome, number]) => `- ${outcome}: ${number}`), '',
    '## Scores by tag', '', '| Tag | Pass |', '| --- | ---: |', ...passRateLines(summary.byTag), '',
    '## Scores by role', '', '| Role | Pass |', '| --- | ---: |', ...passRateLines(summary.byRole), '',
    '## Token usage', '',
    '| | Prompt | Output | Thinking | Total |', '| --- | ---: | ---: | ---: | ---: |',
    `| Total | ${total.prompt} | ${total.output} | ${total.thinking} | ${total.total} |`,
    `| Average | ${average.prompt.toFixed(1)} | ${average.output.toFixed(1)} | ${average.thinking.toFixed(1)} | ${average.total.toFixed(1)} |`, '',
    '## Unsafe actions', '',
    ...failureLines(summary.failures.filter(failure => failure.outcome === 'unsafe_action')), '',
    '## Other failures', '',
    ...failureLines(summary.failures.filter(failure => failure.outcome !== 'unsafe_action')), '',
    '## Per-message measurements', '',
    '| Case | Latency (ms) | Prompt | Output | Thinking | Total |', '| --- | ---: | ---: | ---: | ---: | ---: |',
    ...summary.messages.map(({ id, ms, tokens }) =>
      `| ${id} | ${ms} | ${tokens.prompt} | ${tokens.output} | ${tokens.thinking} | ${tokens.total} |`), '',
  ].join('\n');
}
