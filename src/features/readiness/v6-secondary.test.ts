import { createHash } from 'node:crypto';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { MorningQuestions } from './components/morning-questions';
import { DonePanel } from '../workout/components/done-panel';
import { RankHero } from '../ranks/components/rank-hero';
import { TeamBoard } from '../ranks/components/team-board';
import { ScanMetrics } from '../body-scans/components/scan-metrics';

afterEach(() => vi.unstubAllEnvs());
const render = (element: ReturnType<typeof createElement>, locale: 'ar' | 'en' = 'ar') =>
  renderToStaticMarkup(createElement(LocaleProvider, { locale }, element));

it('preserves pre-T-196 flag-off markup in both languages', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  vi.stubEnv('NEXT_PUBLIC_RANKS_ENABLED', '0');
  const results = (['ar', 'en'] as const).map(locale => [
    createElement(MorningQuestions, { row: null, onChange() {} }),
    createElement(DonePanel), createElement(RankHero, { lifetime: 85 }),
    createElement(TeamBoard, { rows: [] }),
    createElement(ScanMetrics, { scans: [], total: false, target: null }),
  ].map(element => createHash('sha256').update(render(element, locale)).digest('hex')));
  expect(results).toMatchSnapshot();
});

it('shows the approved morning heading and labels behind the v6 flag', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const html = render(createElement(MorningQuestions, { row: null, onChange() {} }));
  expect(html).toContain('علشان الكابتن يعرف تتمرن النهارده إزاي');
  for (const label of ['سؤالين الصبح', 'نمت كام ساعة؟', 'جسمك عامل إيه؟', 'فريش', 'مكسّر']) expect(html).toContain(label);
});
