import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { describe, expect, it, vi } from 'vitest';
import { localDate } from '@/lib/dates';
import { groundIntent } from '../data/ground';
import { planIntent } from '../data/intents';
import { koEvalCases } from './cases';
import type { KoEvalCase } from './cases';
import { matchCase, renderReport, summarize } from './score';
import type { EvalResult, TokenCounts } from './score';

vi.mock('server-only', () => ({}));

type GeminiUsageResponse = {
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
};

describe.skipIf(process.env.KO_EVAL !== '1')('KO baseline eval', () => {
  it('writes the baseline report and raw measurements', async () => {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!key) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is required for the KO eval');
    const gap = Number(process.env.KO_EVAL_GAP_MS ?? 4500);
    const ids = process.env.KO_EVAL_ONLY?.split(',').map(id => id.trim()).filter(Boolean);
    const cases = ids?.length ? koEvalCases.filter(testCase => ids.includes(testCase.id)) : koEvalCases;
    if (!cases.length) throw new Error('KO_EVAL_ONLY did not match any case IDs');

    let model = 'Unknown';
    async function runCase(testCase: KoEvalCase, apiKey: string): Promise<EvalResult> {
      const tokens: TokenCounts = { prompt: 0, output: 0, thinking: 0, total: 0 };
      const fetcher: typeof fetch = async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        model = /\/models\/([^/:]+):generateContent/.exec(url)?.[1] ?? model;
        const response = await fetch(input, init);
        const body = await response.clone().json().catch(() => null) as GeminiUsageResponse | null;
        const usage = body?.usageMetadata;
        tokens.prompt += usage?.promptTokenCount ?? 0;
        tokens.output += usage?.candidatesTokenCount ?? 0;
        tokens.thinking += usage?.thoughtsTokenCount ?? 0;
        tokens.total += usage?.totalTokenCount ?? 0;
        return response;
      };

      let ms = 0;
      let error: string | undefined;
      for (let attempt = 0; attempt < 2; attempt++) {
        if (attempt > 0) await wait(20_000);
        const start = performance.now();
        try {
          const planned = await planIntent(
            testCase.role, { text: testCase.text }, apiKey, AbortSignal.timeout(30_000),
            testCase.context, testCase.history ?? [], fetcher, testCase.facts,
          );
          ms += performance.now() - start;
          // Same grounding as the chat route: latest text plus the last KO question.
          const last = testCase.history?.at(-1);
          const question = last?.role === 'ko' && /[?؟]\s*$/.test(last.text) ? `${last.text}\n` : '';
          const got = planned ? groundIntent(planned, question + testCase.text) : null;
          return { case: testCase, got, outcome: matchCase(testCase, got).outcome, ms: Math.round(ms), tokens };
        } catch (cause) {
          ms += performance.now() - start;
          error = cause instanceof Error ? cause.message : String(cause);
        }
      }
      return { case: testCase, got: null, outcome: 'no_call', ms: Math.round(ms), tokens, error };
    }

    const results: EvalResult[] = [];
    for (const testCase of cases) {
      if (results.length) await wait(gap);
      results.push(await runCase(testCase, key));
    }

    const date = localDate(new Date(), 'Africa/Cairo');
    const directory = join('docs', 'ko', 'eval');
    const base = join(directory, `${date}-${process.env.KO_EVAL_NAME ?? 'baseline'}`);
    const report = renderReport(summarize(results), { model, date, runCount: results.length });
    await mkdir(directory, { recursive: true });
    await writeFile(`${base}.md`, report, 'utf8');
    await writeFile(`${base}.json`, `${JSON.stringify(results, null, 2)}\n`, 'utf8');
    expect(results.length).toBe(cases.length);
  }, 20 * 60_000);
});
